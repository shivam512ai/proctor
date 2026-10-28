import os
import sys
import math
import time
import uuid
import base64
from typing import Optional, List, Dict, Tuple, Any
import numpy as np
import cv2

# Set local cache paths before any ML library import
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(WORKSPACE_DIR, ".cache")
os.environ["KERAS_HOME"] = os.path.join(CACHE_DIR, "keras")
os.environ["DEEPFACE_HOME"] = os.path.join(CACHE_DIR, "deepface")
os.environ["MPLCONFIGDIR"] = os.path.join(CACHE_DIR, "mpl")
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from ultralytics import YOLO
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks import python as mp_python
from deepface import DeepFace

from models import (
    InfractionType,
    Severity,
    InfractionEvent,
    HeadPose,
    DetectedObject,
    FrameAnalysisResult
)

class AntiCheatDetector:
    def __init__(self):
        print("Initializing Anti-Cheat AI Pipeline...")
        # 1. Initialize YOLOv8
        yolo_path = os.path.join(WORKSPACE_DIR, "yolov8n.pt")
        if not os.path.exists(yolo_path):
            yolo_path = "yolov8n.pt"
        self.yolo_model = YOLO(yolo_path)
        print("YOLOv8 initialized.")

        # 2. Initialize MediaPipe FaceLandmarker
        task_path = os.path.join(CACHE_DIR, "models", "face_landmarker.task")
        if not os.path.exists(task_path):
            raise FileNotFoundError(f"MediaPipe model not found at {task_path}")
            
        base_options = mp_python.BaseOptions(model_asset_path=task_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=4,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5
        )
        self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
        print("MediaPipe FaceLandmarker initialized.")

        # Prohibited YOLO COCO classes
        # 0: person, 67: cell phone, 73: book, 63: laptop
        self.prohibited_class_names = {
            "cell phone": (InfractionType.CELL_PHONE, Severity.CRITICAL),
            "book": (InfractionType.PROHIBITED_OBJECT, Severity.WARNING),
            "laptop": (InfractionType.PROHIBITED_OBJECT, Severity.WARNING),
            "remote": (InfractionType.PROHIBITED_OBJECT, Severity.WARNING)
        }

    def decode_image(self, image_data: str) -> np.ndarray:
        """Decode base64 image (handles data:image/...;base64, prefixes)."""
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image data")
        return img

    def extract_face_embedding(self, img_bgr: np.ndarray) -> Optional[np.ndarray]:
        """Compute DeepFace Facenet embedding for face verification."""
        try:
            results = DeepFace.represent(
                img_bgr,
                model_name="Facenet",
                enforce_detection=False,
                detector_backend="opencv"
            )
            if results and len(results) > 0:
                embedding = np.array(results[0]["embedding"], dtype=np.float32)
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                return embedding
        except Exception as e:
            print(f"Error computing face embedding: {e}")
        return None

    def verify_embeddings(self, emb1: np.ndarray, emb2: np.ndarray) -> tuple[bool, float]:
        """Verify two normalized embeddings using cosine similarity/distance."""
        cosine_sim = float(np.dot(emb1, emb2))
        # Cosine distance = 1 - cosine_sim
        distance = 1.0 - cosine_sim
        # Facenet threshold is typically ~0.40 distance
        is_match = distance <= 0.42
        return is_match, round(distance, 4)

    def _extract_head_pose(self, matrix: np.ndarray) -> tuple[float, float, float, str]:
        """Extract yaw, pitch, roll in degrees from a 4x4 transformation matrix."""
        # Matrix is 4x4
        # R = matrix[0:3, 0:3]
        r00, r01, r02 = matrix[0, 0], matrix[0, 1], matrix[0, 2]
        r10, r11, r12 = matrix[1, 0], matrix[1, 1], matrix[1, 2]
        r20, r21, r22 = matrix[2, 0], matrix[2, 1], matrix[2, 2]

        # Euler angles calculation
        sy = math.sqrt(r00 * r00 + r10 * r10)
        singular = sy < 1e-6

        if not singular:
            pitch = math.atan2(r21, r22)
            yaw = math.atan2(-r20, sy)
            roll = math.atan2(r10, r00)
        else:
            pitch = math.atan2(-r12, r11)
            yaw = math.atan2(-r20, sy)
            roll = 0.0

        yaw_deg = math.degrees(yaw)
        pitch_deg = math.degrees(pitch)
        roll_deg = math.degrees(roll)

        direction = "Forward"
        if yaw_deg > 18.0:
            direction = "Looking Left"
        elif yaw_deg < -18.0:
            direction = "Looking Right"
        elif pitch_deg > 18.0:
            direction = "Looking Down"
        elif pitch_deg < -18.0:
            direction = "Looking Up"

        return round(yaw_deg, 1), round(pitch_deg, 1), round(roll_deg, 1), direction

    def analyze_frame(
        self,
        img_bgr: np.ndarray,
        session_id: str,
        reference_embedding: Optional[np.ndarray] = None,
        run_identity_check: bool = False
    ) -> FrameAnalysisResult:
        now = time.time()
        height, width, _ = img_bgr.shape
        infractions: list[InfractionEvent] = []
        detected_objects: list[DetectedObject] = []

        # -------------------------------------------------------------
        # 1. YOLO Detection: Object & Multi-Person Tracking
        # -------------------------------------------------------------
        yolo_results = self.yolo_model(img_bgr, verbose=False, conf=0.35)[0]
        person_count = 0

        for box in yolo_results.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = self.yolo_model.names.get(cls_id, "")
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            
            # Normalize bounding box
            norm_box = [
                round(xyxy[0] / width, 4),
                round(xyxy[1] / height, 4),
                round(xyxy[2] / width, 4),
                round(xyxy[3] / height, 4)
            ]

            if cls_name == "person":
                person_count += 1
            elif cls_name in self.prohibited_class_names:
                infr_type, severity = self.prohibited_class_names[cls_name]
                detected_objects.append(DetectedObject(name=cls_name, confidence=round(conf, 2), box=norm_box))
                
                infractions.append(InfractionEvent(
                    id=str(uuid.uuid4())[:8],
                    timestamp=now,
                    type=infr_type,
                    severity=severity,
                    message=f"Prohibited item detected: {cls_name.upper()} ({int(conf*100)}% conf)",
                    details={"object": cls_name, "confidence": conf, "box": norm_box}
                ))

        # Check person count infractions
        if person_count == 0:
            infractions.append(InfractionEvent(
                id=str(uuid.uuid4())[:8],
                timestamp=now,
                type=InfractionType.NO_FACE,
                severity=Severity.CRITICAL,
                message="Candidate absent: No person detected in camera view"
            ))
        elif person_count > 1:
            infractions.append(InfractionEvent(
                id=str(uuid.uuid4())[:8],
                timestamp=now,
                type=InfractionType.MULTIPLE_FACES,
                severity=Severity.CRITICAL,
                message=f"Multiple persons detected: {person_count} individuals in frame"
            ))

        # -------------------------------------------------------------
        # 2. MediaPipe FaceLandmarker: Gaze, Pose, Mesh, Speaking
        # -------------------------------------------------------------
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        landmarker_result = self.face_landmarker.detect(mp_image)

        num_faces = len(landmarker_result.face_landmarks)
        head_pose = HeadPose()
        gaze_direction = "Center"
        mouth_open = False
        landmarks_preview = None

        if num_faces > 0:
            face_lms = landmarker_result.face_landmarks[0]
            # Key landmarks for light frontend preview
            # Nose tip (1), chin (152), left eye outer (33), right eye outer (263), mouth top (13), mouth bottom (14)
            sample_indices = [1, 33, 263, 61, 291, 199, 10, 152, 13, 14]
            landmarks_preview = [
                [round(face_lms[i].x, 4), round(face_lms[i].y, 4)]
                for i in sample_indices if i < len(face_lms)
            ]

            # Head Pose from transformation matrix
            if landmarker_result.facial_transformation_matrixes:
                mat = landmarker_result.facial_transformation_matrixes[0]
                yaw, pitch, roll, direction = self._extract_head_pose(mat)
                head_pose = HeadPose(yaw=yaw, pitch=pitch, roll=roll, direction=direction)

                if direction in ["Looking Left", "Looking Right"]:
                    infractions.append(InfractionEvent(
                        id=str(uuid.uuid4())[:8],
                        timestamp=now,
                        type=InfractionType.LOOKING_AWAY,
                        severity=Severity.WARNING,
                        message=f"Candidate {direction.lower()} (Yaw: {yaw}°)",
                        details={"yaw": yaw, "pitch": pitch, "roll": roll}
                    ))
                elif direction == "Looking Down":
                    infractions.append(InfractionEvent(
                        id=str(uuid.uuid4())[:8],
                        timestamp=now,
                        type=InfractionType.LOOKING_DOWN,
                        severity=Severity.WARNING,
                        message=f"Candidate looking downward towards desk/notes (Pitch: {pitch}°)",
                        details={"yaw": yaw, "pitch": pitch, "roll": roll}
                    ))

            # Blendshapes for Gaze and Mouth movement
            if landmarker_result.face_blendshapes:
                shapes = {b.category_name: b.score for b in landmarker_result.face_blendshapes[0]}
                
                # Eye gaze detection
                look_left = shapes.get("eyeLookOutLeft", 0) + shapes.get("eyeLookInRight", 0)
                look_right = shapes.get("eyeLookInLeft", 0) + shapes.get("eyeLookOutRight", 0)
                look_down = shapes.get("eyeLookDownLeft", 0) + shapes.get("eyeLookDownRight", 0)
                look_up = shapes.get("eyeLookUpLeft", 0) + shapes.get("eyeLookUpRight", 0)

                if look_left > 0.85:
                    gaze_direction = "Left"
                elif look_right > 0.85:
                    gaze_direction = "Right"
                elif look_down > 0.85:
                    gaze_direction = "Down"
                elif look_up > 0.85:
                    gaze_direction = "Up"

                # Jaw open (Speaking / Whispering)
                jaw_open = shapes.get("jawOpen", 0.0)
                if jaw_open > 0.45:
                    mouth_open = True
                    infractions.append(InfractionEvent(
                        id=str(uuid.uuid4())[:8],
                        timestamp=now,
                        type=InfractionType.SPEAKING,
                        severity=Severity.INFO,
                        message="Speaking or mouth movement detected",
                        details={"jaw_open_score": round(jaw_open, 2)}
                    ))

        # Check if more than one face found by MediaPipe even if YOLO saw 1 person
        if num_faces > 1 and person_count <= 1:
            infractions.append(InfractionEvent(
                id=str(uuid.uuid4())[:8],
                timestamp=now,
                type=InfractionType.MULTIPLE_FACES,
                severity=Severity.CRITICAL,
                message=f"Secondary face visible in background ({num_faces} faces detected)"
            ))

        # -------------------------------------------------------------
        # 3. DeepFace Identity Verification (Continuous / Periodic)
        # -------------------------------------------------------------
        deepface_match = None
        deepface_distance = None

        if run_identity_check and reference_embedding is not None and num_faces > 0:
            current_embedding = self.extract_face_embedding(img_bgr)
            if current_embedding is not None:
                is_match, dist = self.verify_embeddings(reference_embedding, current_embedding)
                deepface_match = is_match
                deepface_distance = dist
                if not is_match:
                    infractions.append(InfractionEvent(
                        id=str(uuid.uuid4())[:8],
                        timestamp=now,
                        type=InfractionType.IDENTITY_MISMATCH,
                        severity=Severity.CRITICAL,
                        message=f"Face mismatch! Test-taker does not match registered candidate (Distance: {dist})",
                        details={"distance": dist, "match": False}
                    ))

        return FrameAnalysisResult(
            timestamp=now,
            face_detected=(num_faces > 0),
            num_faces=num_faces,
            head_pose=head_pose,
            gaze_direction=gaze_direction,
            mouth_open=mouth_open,
            detected_objects=detected_objects,
            active_infractions=infractions,
            trust_score=100.0,  # Will be managed/decayed by SessionManager
            deepface_match=deepface_match,
            deepface_distance=deepface_distance,
            landmarks_preview=landmarks_preview
        )
