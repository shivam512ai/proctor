import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, ShieldAlert, Sparkles, User, AlertTriangle, Video, Mic } from 'lucide-react';

export default function OnboardingModal({ onComplete }) {
  const [candidateName, setCandidateName] = useState('Alex Mercer');
  const [candidateId, setCandidateId] = useState('ENG-2026-9041');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize camera and mic
  useEffect(() => {
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);

        // Audio meter setup
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudio);
        };
        updateAudio();
        setMicActive(true);
      } catch (err) {
        console.error("Media permission error:", err);
        setErrorMsg("Camera or microphone permission was denied. Please allow access to proceed with proctored exam.");
      }
    }

    startMedia();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidateId.trim()) {
      setErrorMsg("Please provide your full name and student/candidate ID.");
      return;
    }
    if (!capturedPhoto) {
      setErrorMsg("Please capture your baseline reference photo for DeepFace face verification.");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const sessionId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const response = await fetch('http://localhost:8000/api/session/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          candidate_name: candidateName,
          candidate_id: candidateId,
          reference_image: capturedPhoto
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}`);
      }

      const data = await response.json();
      console.log("Candidate enrolled successfully:", data);

      onComplete({
        sessionId,
        candidateName,
        candidateId,
        referencePhoto: capturedPhoto
      });
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMsg("Failed to connect to proctoring backend. Ensure FastAPI server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-800/80 pb-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Secure Proctoring Verification
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                AI Automated
              </span>
            </h2>
            <p className="text-sm text-slate-400">
              Identity onboarding & hardware integrity check before entering exam room
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g. Sarah Connor"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Candidate ID
              </label>
              <input
                type="text"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g. STU-84920"
                required
              />
            </div>
          </div>

          {/* Camera / ID Photo Capture */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                Candidate ID Facial Baseline (DeepFace)
              </label>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Video className={`w-3.5 h-3.5 ${cameraActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {cameraActive ? 'Camera Ready' : 'Connecting...'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${micActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  Mic
                  <span className="w-8 bg-slate-800 rounded-full h-1.5 overflow-hidden inline-block ml-1">
                    <span 
                      className="bg-emerald-400 h-full block transition-all duration-75"
                      style={{ width: `${micVolume}%` }}
                    />
                  </span>
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center group">
              {capturedPhoto ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured baseline"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center">
                    <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Face Baseline Captured & Enrolled
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="absolute bottom-3 right-3 text-xs px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-md"
                  >
                    Retake Photo
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Facial guide oval */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-60 border-2 border-dashed border-indigo-400/60 rounded-[50%] flex items-center justify-center">
                      <span className="text-[10px] text-indigo-300/80 bg-slate-950/70 px-2 py-0.5 rounded-full">
                        Center face here
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={!cameraActive}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs px-5 py-2.5 rounded-full shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Reference Photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Exam Rules & Lock-down Consent */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-slate-300">
            <p className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Real-Time AI Proctored Rules:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li><strong className="text-slate-300">Continuous Face Lock:</strong> MediaPipe tracks gaze direction; looking away or downward repeatedly will flag an incident.</li>
              <li><strong className="text-slate-300">Prohibited Device Radar:</strong> YOLO detects cell phones, books, and unauthorized hardware instantly.</li>
              <li><strong className="text-slate-300">Identity Guard:</strong> DeepFace continuously checks that only the enrolled candidate is in front of the screen.</li>
              <li><strong className="text-slate-300">Screen Lock:</strong> Exiting fullscreen or switching browser tabs immediately logs a critical violation.</li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading || !capturedPhoto}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl text-sm shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enrolling with DeepFace & Starting Session...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Agree & Enter Proctored Exam
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
