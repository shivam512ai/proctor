import os
import sys
import time
import json
import uuid
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from models import (
    CandidateRegistration,
    ClientViolationEvent,
    SessionSummary,
    InfractionEvent,
    InfractionType,
    Severity,
    FrameAnalysisResult
)
from detector import AntiCheatDetector
from session_manager import SessionManager

# Global detector and session manager
detector: AntiCheatDetector = None
session_manager: SessionManager = SessionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector
    print("Starting up Anti-Cheat AI Server...")
    detector = AntiCheatDetector()
    print("Anti-Cheat Engine ready.")
    yield
    print("Shutting down Anti-Cheat Server.")

app = FastAPI(title="Anti-Cheat Web Proctored Engine", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "FastAPI + YOLOv8 + MediaPipe + DeepFace",
        "timestamp": time.time(),
        "detector_loaded": detector is not None
    }

@app.post("/api/session/register")
async def register_session(reg: CandidateRegistration):
    try:
        # Decode reference photo and compute DeepFace facial embedding
        ref_bgr = detector.decode_image(reg.reference_image)
        ref_embedding = detector.extract_face_embedding(ref_bgr)
        
        session = session_manager.create_session(reg, ref_embedding)
        return {
            "status": "success",
            "session_id": session.session_id,
            "candidate_name": session.candidate_name,
            "has_embedding": ref_embedding is not None,
            "message": "Candidate enrolled and facial baseline stored."
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@app.post("/api/session/{session_id}/event")
async def report_client_violation(session_id: str, event: ClientViolationEvent):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    severity = Severity.WARNING
    if event.violation_type in [InfractionType.TAB_SWITCH, InfractionType.FULLSCREEN_EXIT]:
        severity = Severity.CRITICAL

    infr = InfractionEvent(
        id=str(uuid.uuid4())[:8],
        timestamp=time.time(),
        type=event.violation_type,
        severity=severity,
        message=event.details or f"Client-side violation: {event.violation_type.value}"
    )

    if session.should_record_infraction(event.violation_type, cooldown=2.0):
        session.add_infraction(infr)

    return {
        "status": "recorded",
        "trust_score": session.trust_score,
        "total_infractions": len(session.infractions)
    }

@app.post("/api/session/{session_id}/submit")
async def submit_exam(session_id: str):
    summary = session_manager.end_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary

@app.get("/api/session/{session_id}/report", response_model=SessionSummary)
async def get_report(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.get_summary()

@app.websocket("/ws/proctor/{session_id}")
async def proctor_websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = session_manager.get_session(session_id)
    print(f"WebSocket client connected for session: {session_id}")

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                payload = json.loads(raw_data)
                frame_data = payload.get("frame")
                if not frame_data:
                    continue

                # Periodic DeepFace identity check (every ~12 seconds)
                run_identity = False
                now = time.time()
                if session and (now - session.last_identity_check_time > 12.0):
                    run_identity = True
                    session.last_identity_check_time = now

                # Run multi-modal detection
                img_bgr = detector.decode_image(frame_data)
                ref_emb = session.reference_embedding if session else None
                result: FrameAnalysisResult = detector.analyze_frame(
                    img_bgr,
                    session_id=session_id,
                    reference_embedding=ref_emb,
                    run_identity_check=run_identity
                )

                # Record infractions with cooldown and update session trust score
                if session:
                    for inf in result.active_infractions:
                        # Only record critical or distinct infractions into session history
                        cooldown = 4.0 if inf.severity == Severity.CRITICAL else 6.0
                        if session.should_record_infraction(inf.type, cooldown=cooldown):
                            # Attach current frame as evidence snapshot for severe events
                            snapshot = frame_data if inf.severity == Severity.CRITICAL else None
                            session.add_infraction(inf, snapshot_b64=snapshot)

                    result.trust_score = session.trust_score

                # Send response back to frontend
                await websocket.send_text(result.model_dump_json())

            except Exception as e:
                # Log frame error and continue
                print(f"Frame processing error: {e}")
                err_response = {
                    "error": str(e),
                    "timestamp": time.time(),
                    "trust_score": session.trust_score if session else 100.0
                }
                await websocket.send_text(json.dumps(err_response))

    except WebSocketDisconnect:
        print(f"WebSocket client disconnected for session: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
