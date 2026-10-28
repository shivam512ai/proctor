import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  Smartphone, 
  Users, 
  Eye, 
  Volume2, 
  Fingerprint, 
  Activity, 
  Compass, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export default function ProctorHUD({ 
  sessionId, 
  candidateName, 
  onInfraction, 
  trustScore, 
  setTrustScore 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameIntervalRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState({
    face_detected: true,
    num_faces: 1,
    head_pose: { yaw: 0, pitch: 0, roll: 0, direction: "Forward" },
    gaze_direction: "Center",
    mouth_open: false,
    detected_objects: [],
    deepface_match: true,
    deepface_distance: 0.15,
    active_infractions: []
  });

  const lastInfractionSoundRef = useRef(0);

  // Connect WebSocket & stream frames
  useEffect(() => {
    if (!sessionId) return;

    let isSubscribed = true;
    const wsUrl = `ws://localhost:8000/ws/proctor/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isSubscribed) {
        console.log("Connected to Proctor AI WebSocket");
        setConnected(true);
      }
    };

    ws.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.warn("Backend proctor warning:", data.error);
          return;
        }

        setTelemetry(data);
        if (data.trust_score !== undefined && setTrustScore) {
          setTrustScore(data.trust_score);
        }

        // Trigger notifications and sounds if new infractions detected
        if (data.active_infractions && data.active_infractions.length > 0) {
          const now = Date.now();
          const hasCritical = data.active_infractions.some(i => i.severity === 'critical');
          
          if (now - lastInfractionSoundRef.current > 3000) {
            if (hasCritical) {
              soundEffects.playCriticalAlarm();
            } else {
              soundEffects.playWarningBeep();
            }
            lastInfractionSoundRef.current = now;
          }

          if (onInfraction) {
            data.active_infractions.forEach(inf => onInfraction(inf));
          }
        }

        // Draw overlays onto canvas
        drawOverlay(data);
      } catch (e) {
        console.error("Error parsing proctor message:", e);
      }
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false);
    };

    // Camera setup
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Hidden canvas for capturing frame to send to server
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = 480;
        hiddenCanvas.height = 360;
        hiddenCanvasRef.current = hiddenCanvas;
        const ctx = hiddenCanvas.getContext('2d');

        // Send frames at ~6 FPS (160ms interval) to balance bandwidth and instant detection
        frameIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && videoRef.current && videoRef.current.readyState >= 2) {
            ctx.drawImage(videoRef.current, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
            const frameData = hiddenCanvas.toDataURL('image/jpeg', 0.65);
            ws.send(JSON.stringify({ frame: frameData, timestamp: Date.now() }));
          }
        }, 160);
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }

    startCamera();

    return () => {
      isSubscribed = false;
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [sessionId]);

  // Canvas overlay rendering for bounding boxes, facial landmarks, and indicators
  const drawOverlay = useCallback((data) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw detected objects from YOLO (Cell phone, books, etc.)
    if (data.detected_objects && data.detected_objects.length > 0) {
      data.detected_objects.forEach(obj => {
        const [x1, y1, x2, y2] = obj.box;
        const bx = x1 * width;
        const by = y1 * height;
        const bw = (x2 - x1) * width;
        const bh = (y2 - y1) * height;

        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        // Label tag
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx, by - 22, bw, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`🚨 ${obj.name.toUpperCase()} (${Math.round(obj.confidence * 100)}%)`, bx + 5, by - 6);
      });
    }

    // 2. Draw key facial landmarks from MediaPipe
    if (data.landmarks_preview && data.landmarks_preview.length > 0) {
      ctx.fillStyle = '#6366f1'; // Indigo
      data.landmarks_preview.forEach(([lx, ly]) => {
        ctx.beginPath();
        ctx.arc(lx * width, ly * height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 3. Head pose orientation HUD indicator
    if (data.head_pose) {
      const { yaw, pitch, direction } = data.head_pose;
      const isLookingAway = direction !== "Forward";

      ctx.fillStyle = isLookingAway ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(8, 8, 140, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${direction} (Y:${yaw}° P:${pitch}°)`, 14, 24);
    }
  }, []);

  // Determine trust score colors
  const getScoreBadge = () => {
    if (trustScore >= 80) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'CLEAN' };
    if (trustScore >= 60) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'SUSPICIOUS' };
    return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'FLAGGED' };
  };

  const scoreBadge = getScoreBadge();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4 backdrop-blur-md">
      {/* Video & Canvas Container */}
      <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 group shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Live Status Pill */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-300">
            {connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3 text-emerald-400" />
                Live AI
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <WifiOff className="w-3 h-3 text-amber-400" />
                Connecting
              </>
            )}
          </div>
        </div>

        {/* Prohibited Object Alert Overlay Banner */}
        {telemetry.detected_objects && telemetry.detected_objects.length > 0 && (
          <div className="absolute bottom-2 inset-x-2 bg-red-600/90 backdrop-blur-md text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-between shadow-lg animate-bounce">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-white" />
              PROHIBITED OBJECT: {telemetry.detected_objects[0].name.toUpperCase()}
            </span>
            <span className="text-[10px] bg-red-950/80 px-2 py-0.5 rounded">INCIDENT LOGGED</span>
          </div>
        )}
      </div>

      {/* Trust Score & Integrity Strip */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${scoreBadge.bg} ${scoreBadge.text} border ${scoreBadge.border}`}>
            {trustScore >= 60 ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Integrity Trust Score
            </div>
            <div className="text-lg font-black text-white flex items-center gap-2">
              {trustScore}%
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${scoreBadge.bg} ${scoreBadge.text} border ${scoreBadge.border}`}>
                {scoreBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Miniature Progress Ring */}
        <div className="w-11 h-11 relative flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${trustScore >= 80 ? 'text-emerald-500' : trustScore >= 60 ? 'text-amber-500' : 'text-red-500'} transition-all duration-300`}
              strokeDasharray={`${trustScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <Activity className="w-4 h-4 text-slate-400 absolute" />
        </div>
      </div>

      {/* Multi-Sensor AI Diagnostics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Sensor 1: Person Count (YOLO) */}
        <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
          telemetry.num_faces === 1 
            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' 
            : 'bg-red-500/10 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Occupancy (YOLO)
            </span>
            <span className={`font-bold ${telemetry.num_faces === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {telemetry.num_faces} Person
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {telemetry.num_faces === 1 ? 'Single test-taker locked' : telemetry.num_faces === 0 ? 'No person in frame!' : 'Multiple persons detected!'}
          </span>
        </div>

        {/* Sensor 2: Gaze & Head Direction (MediaPipe) */}
        <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
          telemetry.head_pose?.direction === 'Forward' 
            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' 
            : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Gaze (MediaPipe)
            </span>
            <span className={`font-bold ${telemetry.head_pose?.direction === 'Forward' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {telemetry.head_pose?.direction || 'Center'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Pitch: {telemetry.head_pose?.pitch || 0}° | Yaw: {telemetry.head_pose?.yaw || 0}°
          </span>
        </div>

        {/* Sensor 3: Facial Identity Match (DeepFace) */}
        <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
          telemetry.deepface_match !== false
            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' 
            : 'bg-red-500/10 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
              Identity (DeepFace)
            </span>
            <span className={`font-bold ${telemetry.deepface_match !== false ? 'text-emerald-400' : 'text-red-400'}`}>
              {telemetry.deepface_match !== false ? 'Matched' : 'MISMATCH'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {telemetry.deepface_distance !== null ? `Distance: ${telemetry.deepface_distance}` : 'Continuous verified'}
          </span>
        </div>

        {/* Sensor 4: Speech / Whispering Detection */}
        <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
          !telemetry.mouth_open 
            ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' 
            : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              Mouth Motion
            </span>
            <span className={`font-bold ${!telemetry.mouth_open ? 'text-emerald-400' : 'text-amber-400'}`}>
              {telemetry.mouth_open ? 'Speaking' : 'Silent'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {telemetry.mouth_open ? 'Talking / whispering flagged' : 'No vocalization detected'}
          </span>
        </div>
      </div>
    </div>
  );
}
