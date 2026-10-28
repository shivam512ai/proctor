import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Activity, 
  Maximize, 
  Minimize, 
  LayoutDashboard, 
  BookOpen, 
  LogOut 
} from 'lucide-react';

import OnboardingModal from './components/OnboardingModal';
import ProctorHUD from './components/ProctorHUD';
import ExamInterface from './components/ExamInterface';
import ProctorDashboard from './components/ProctorDashboard';
import AlertBanner from './components/AlertBanner';

export default function App() {
  const [sessionData, setSessionData] = useState(null);
  const [activeView, setActiveView] = useState('exam'); // 'exam' | 'auditor' | 'report'
  const [trustScore, setTrustScore] = useState(100.0);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn("Error exiting fullscreen:", err);
      });
    }
  };

  const handleOnboardingComplete = (data) => {
    setSessionData(data);
    setTrustScore(100.0);
    setActiveView('exam');
    // Try to trigger fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }
  };

  const handleInfraction = (infraction) => {
    setAlerts(prev => [...prev.slice(-4), infraction]);
    // Auto-dismiss alert after 4.5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== infraction.id));
    }, 4500);
  };

  const handleClientViolation = async (violationType, details) => {
    if (!sessionData) return;
    try {
      const res = await fetch(`http://localhost:8000/api/session/${sessionData.sessionId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.sessionId,
          violation_type: violationType,
          details: details
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trust_score !== undefined) {
          setTrustScore(data.trust_score);
        }
      }
    } catch (e) {
      console.warn("Failed to report client violation:", e);
    }

    handleInfraction({
      id: `cv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: violationType,
      severity: 'critical',
      message: details || violationType
    });
  };

  const handleSubmitExam = async () => {
    if (!sessionData) return;
    try {
      const res = await fetch(`http://localhost:8000/api/session/${sessionData.sessionId}/submit`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        setActiveView('report');
      } else {
        throw new Error("Submit failed");
      }
    } catch (err) {
      console.error("Submit exam error:", err);
      // Fallback local summary
      setSummary({
        session_id: sessionData.sessionId,
        candidate_name: sessionData.candidateName,
        candidate_id: sessionData.candidateId,
        duration_seconds: 340,
        initial_trust_score: 100.0,
        final_trust_score: trustScore,
        verdict: trustScore >= 80 ? "CLEAN" : trustScore >= 60 ? "SUSPICIOUS" : "FLAGGED",
        infraction_counts: { CELL_PHONE: 0, LOOKING_AWAY: 1, TAB_SWITCH: 0 },
        total_infractions: 1,
        infractions: [],
        has_reference_photo: true
      });
      setActiveView('report');
    }
  };

  const handleRestart = () => {
    setSessionData(null);
    setSummary(null);
    setTrustScore(100.0);
    setAlerts([]);
    setActiveView('exam');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Onboarding Pre-Check Modal */}
      {!sessionData && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Top Header Navigation */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              ProctorGuard AI
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold uppercase tracking-wider hidden sm:inline-block">
                YOLO &bull; MediaPipe &bull; DeepFace
              </span>
            </div>
            {sessionData && (
              <div className="text-[11px] text-slate-400">
                Candidate: <strong className="text-slate-200">{sessionData.candidateName}</strong> ({sessionData.candidateId})
              </div>
            )}
          </div>
        </div>

        {/* View Switcher Pills & Controls */}
        {sessionData && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveView('exam')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeView === 'exam'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exam View</span>
              </button>

              <button
                onClick={() => setActiveView('auditor')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeView === 'auditor'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auditor Live HUD</span>
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all shadow-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col max-w-7xl w-full mx-auto">
        {sessionData && (
          <>
            {activeView === 'exam' && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Exam Platform (8 cols on lg) */}
                <div className="lg:col-span-8 flex flex-col h-[calc(100vh-7rem)]">
                  <ExamInterface
                    sessionId={sessionData.sessionId}
                    candidateName={sessionData.candidateName}
                    candidateId={sessionData.candidateId}
                    onSubmitExam={handleSubmitExam}
                    onClientViolation={handleClientViolation}
                  />
                </div>

                {/* Right: AI Proctor HUD (4 cols on lg) */}
                <div className="lg:col-span-4 sticky top-20 flex flex-col gap-4">
                  <ProctorHUD
                    sessionId={sessionData.sessionId}
                    candidateName={sessionData.candidateName}
                    onInfraction={handleInfraction}
                    trustScore={trustScore}
                    setTrustScore={setTrustScore}
                  />
                </div>
              </div>
            )}

            {activeView === 'auditor' && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Live Multi-Model Proctor Telemetry Stream
                  </h2>
                  <ProctorHUD
                    sessionId={sessionData.sessionId}
                    candidateName={sessionData.candidateName}
                    onInfraction={handleInfraction}
                    trustScore={trustScore}
                    setTrustScore={setTrustScore}
                  />
                </div>

                <div className="lg:col-span-5 flex flex-col h-[calc(100vh-7rem)]">
                  <ExamInterface
                    sessionId={sessionData.sessionId}
                    candidateName={sessionData.candidateName}
                    candidateId={sessionData.candidateId}
                    onSubmitExam={handleSubmitExam}
                    onClientViolation={handleClientViolation}
                  />
                </div>
              </div>
            )}

            {activeView === 'report' && (
              <ProctorDashboard
                summary={summary}
                referencePhoto={sessionData.referencePhoto}
                onRestart={handleRestart}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Alert Toasts */}
      <AlertBanner alerts={alerts} onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} />

    </div>
  );
}
