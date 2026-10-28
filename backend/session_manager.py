import time
import uuid
import numpy as np
from typing import Dict, List, Optional
from models import (
    InfractionEvent,
    InfractionType,
    Severity,
    SessionSummary,
    CandidateRegistration
)

class ExamSession:
    def __init__(self, session_id: str, candidate_name: str, candidate_id: str):
        self.session_id = session_id
        self.candidate_name = candidate_name
        self.candidate_id = candidate_id
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        
        self.reference_image_b64: Optional[str] = None
        self.reference_embedding: Optional[np.ndarray] = None
        
        self.trust_score: float = 100.0
        self.infractions: List[InfractionEvent] = []
        
        # Throttling trackers to avoid alert spamming
        self.last_infraction_time: Dict[str, float] = {}
        self.infraction_counts: Dict[str, int] = {t.value: 0 for t in InfractionType}
        
        # Face verification timer
        self.last_identity_check_time: float = 0.0

    def should_record_infraction(self, infr_type: InfractionType, cooldown: float = 4.0) -> bool:
        """Rate limit consecutive duplicate infractions."""
        now = time.time()
        last = self.last_infraction_time.get(infr_type.value, 0.0)
        if now - last >= cooldown:
            self.last_infraction_time[infr_type.value] = now
            return True
        return False

    def add_infraction(self, infraction: InfractionEvent, snapshot_b64: Optional[str] = None):
        """Record infraction and decrement trust score."""
        if snapshot_b64 and not infraction.snapshot:
            infraction.snapshot = snapshot_b64

        self.infractions.append(infraction)
        self.infraction_counts[infraction.type.value] = self.infraction_counts.get(infraction.type.value, 0) + 1

        # Penalize trust score based on severity
        if infraction.severity == Severity.CRITICAL:
            penalty = 18.0
        elif infraction.severity == Severity.WARNING:
            penalty = 7.0
        else:
            penalty = 3.0

        self.trust_score = max(0.0, round(self.trust_score - penalty, 1))

    def get_summary(self) -> SessionSummary:
        now = time.time()
        duration = (self.end_time or now) - self.start_time
        
        critical_count = sum(1 for inf in self.infractions if inf.severity == Severity.CRITICAL)
        
        if self.trust_score >= 85.0 and critical_count == 0:
            verdict = "CLEAN"
        elif self.trust_score >= 60.0 and critical_count < 2:
            verdict = "SUSPICIOUS"
        else:
            verdict = "FLAGGED"

        return SessionSummary(
            session_id=self.session_id,
            candidate_name=self.candidate_name,
            candidate_id=self.candidate_id,
            start_time=self.start_time,
            end_time=self.end_time,
            duration_seconds=round(duration, 1),
            initial_trust_score=100.0,
            final_trust_score=self.trust_score,
            verdict=verdict,
            infraction_counts=self.infraction_counts,
            total_infractions=len(self.infractions),
            infractions=self.infractions[-100:],  # Recent 100 infractions
            has_reference_photo=self.reference_image_b64 is not None
        )

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, ExamSession] = {}

    def create_session(self, reg: CandidateRegistration, embedding: Optional[np.ndarray]) -> ExamSession:
        session = ExamSession(
            session_id=reg.session_id,
            candidate_name=reg.candidate_name,
            candidate_id=reg.candidate_id
        )
        session.reference_image_b64 = reg.reference_image
        session.reference_embedding = embedding
        self.sessions[reg.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ExamSession]:
        return self.sessions.get(session_id)

    def end_session(self, session_id: str) -> Optional[SessionSummary]:
        session = self.get_session(session_id)
        if session:
            session.end_time = time.time()
            return session.get_summary()
        return None
