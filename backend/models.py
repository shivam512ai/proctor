from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import time

class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class InfractionType(str, Enum):
    NO_FACE = "NO_FACE"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    LOOKING_AWAY = "LOOKING_AWAY"
    LOOKING_DOWN = "LOOKING_DOWN"
    SPEAKING = "SPEAKING"
    CELL_PHONE = "CELL_PHONE"
    PROHIBITED_OBJECT = "PROHIBITED_OBJECT"
    IDENTITY_MISMATCH = "IDENTITY_MISMATCH"
    TAB_SWITCH = "TAB_SWITCH"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"
    KEY_VIOLATION = "KEY_VIOLATION"

class InfractionEvent(BaseModel):
    id: str
    timestamp: float = Field(default_factory=time.time)
    type: InfractionType
    severity: Severity
    message: str
    details: Optional[Dict[str, Any]] = None
    snapshot: Optional[str] = None  # Base64 image snapshot

class HeadPose(BaseModel):
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    direction: str = "Forward"

class DetectedObject(BaseModel):
    name: str
    confidence: float
    box: List[float]  # [x1, y1, x2, y2] normalized 0-1

class FrameAnalysisResult(BaseModel):
    timestamp: float
    face_detected: bool
    num_faces: int
    head_pose: HeadPose
    gaze_direction: str
    mouth_open: bool
    detected_objects: List[DetectedObject]
    active_infractions: List[InfractionEvent]
    trust_score: float
    deepface_match: Optional[bool] = None
    deepface_distance: Optional[float] = None
    landmarks_preview: Optional[List[List[float]]] = None

class CandidateRegistration(BaseModel):
    session_id: str
    candidate_name: str
    candidate_id: str
    reference_image: str  # Base64 data URL

class ClientViolationEvent(BaseModel):
    session_id: str
    violation_type: InfractionType
    details: Optional[str] = None

class SessionSummary(BaseModel):
    session_id: str
    candidate_name: str
    candidate_id: str
    start_time: float
    end_time: Optional[float] = None
    duration_seconds: float
    initial_trust_score: float = 100.0
    final_trust_score: float
    verdict: str  # "CLEAN", "SUSPICIOUS", "FLAGGED"
    infraction_counts: Dict[str, int]
    total_infractions: int
    infractions: List[InfractionEvent]
    has_reference_photo: bool
