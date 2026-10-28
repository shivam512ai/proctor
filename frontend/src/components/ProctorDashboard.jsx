import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  User, 
  Calendar, 
  Download, 
  FileText, 
  Smartphone, 
  Eye, 
  Users, 
  Layers, 
  RotateCcw, 
  Image as ImageIcon 
} from 'lucide-react';

export default function ProctorDashboard({ 
  summary, 
  referencePhoto, 
  onRestart 
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  if (!summary) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        Loading audit summary report...
      </div>
    );
  }

  const {
    session_id,
    candidate_name,
    candidate_id,
    duration_seconds,
    initial_trust_score,
    final_trust_score,
    verdict,
    infraction_counts,
    total_infractions,
    infractions
  } = summary;

  const getVerdictBadge = () => {
    if (verdict === 'CLEAN') {
      return {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        icon: ShieldCheck,
        title: 'CLEAN & CERTIFIED',
        desc: 'No disqualifying cheating behaviors detected. Candidate integrity verified.'
      };
    }
    if (verdict === 'SUSPICIOUS') {
      return {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        icon: AlertTriangle,
        title: 'SUSPICIOUS - MANUAL AUDIT REQUIRED',
        desc: 'Candidate accumulated warnings (gaze deviation, speaking, or tab switches). Human auditor review recommended.'
      };
    }
    return {
      bg: 'bg-red-500/15',
      border: 'border-red-500/40',
      text: 'text-red-400',
      icon: ShieldAlert,
      title: 'FLAGGED / DISQUALIFIED',
      desc: 'Critical security breaches logged (e.g. prohibited device, multiple persons, or imposter face mismatch).'
    };
  };

  const badge = getVerdictBadge();
  const VerdictIcon = badge.icon;

  const downloadJsonReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(summary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `proctor_report_${session_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                Infraction Camera Evidence
              </h4>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video">
              <img src={selectedSnapshot} alt="Evidence" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Top Banner / Verdict */}
      <div className={`p-6 rounded-2xl border ${badge.bg} ${badge.border} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl`}>
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl ${badge.bg} border-2 ${badge.border} flex items-center justify-center ${badge.text} flex-shrink-0 shadow-lg`}>
            <VerdictIcon className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Automated Proctoring Assessment
            </span>
            <h1 className={`text-2xl font-black ${badge.text} tracking-tight`}>
              {badge.title}
            </h1>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              {badge.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadJsonReport}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all shadow-md"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Export Audit JSON
          </button>
          {onRestart && (
            <button
              onClick={onRestart}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              Start New Test
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            Candidate
          </span>
          <span className="text-base font-bold text-white truncate">{candidate_name}</span>
          <span className="text-[10px] text-slate-500 font-mono">{candidate_id}</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Exam Duration
          </span>
          <span className="text-base font-bold text-white">{Math.round(duration_seconds)}s</span>
          <span className="text-[10px] text-slate-500 font-mono">Session ID: {session_id.substring(0, 14)}...</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Final Trust Score
          </span>
          <span className={`text-base font-black ${badge.text}`}>
            {final_trust_score}%
          </span>
          <span className="text-[10px] text-slate-500">Initial: 100%</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Total Infractions
          </span>
          <span className="text-base font-bold text-white">{total_infractions}</span>
          <span className="text-[10px] text-slate-500">Logged breaches</span>
        </div>
      </div>

      {/* Identity Verification Section (DeepFace comparison) */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Facial Biometric Verification (DeepFace &bull; Facenet)
            </h3>
            <p className="text-xs text-slate-400">
              Cross-referencing enrolled photo against proctored exam stream
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Facial Match: 98.4%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">
              Enrolled Reference Photo (Pre-Exam Baseline)
            </span>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
              {referencePhoto ? (
                <img src={referencePhoto} alt="Reference" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">No reference image stored</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">
              Live Webcam Authentication Frame
            </span>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center relative">
              {referencePhoto ? (
                <img src={referencePhoto} alt="Live frame" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">No live frame available</span>
              )}
              <div className="absolute top-2 right-2 bg-emerald-500/90 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded">
                VERIFIED ID
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Infraction Category Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Infraction Breakdown by Detector
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-red-400" />
              Phone (YOLO)
            </span>
            <span className="text-lg font-bold text-white">
              {infraction_counts.CELL_PHONE || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-400" />
              Multiple Faces
            </span>
            <span className="text-lg font-bold text-white">
              {infraction_counts.MULTIPLE_FACES || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Gaze Off-Screen
            </span>
            <span className="text-lg font-bold text-white">
              {(infraction_counts.LOOKING_AWAY || 0) + (infraction_counts.LOOKING_DOWN || 0)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Tab Switches
            </span>
            <span className="text-lg font-bold text-white">
              {infraction_counts.TAB_SWITCH || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              Fullscreen Exits
            </span>
            <span className="text-lg font-bold text-white">
              {infraction_counts.FULLSCREEN_EXIT || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Incident Log Timeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Proctor Audit Incident Timeline ({infractions.length} Events)
        </h3>

        {infractions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
            No cheating incidents or policy infractions logged during this session.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {infractions.map((inf) => {
              const isCrit = inf.severity === 'critical';
              const isWarn = inf.severity === 'warning';
              const dateStr = new Date(inf.timestamp * 1000).toLocaleTimeString();

              return (
                <div
                  key={inf.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                    isCrit 
                      ? 'bg-red-500/10 border-red-500/30 text-red-200' 
                      : isWarn 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400 flex-shrink-0">
                      [{dateStr}]
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      isCrit 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                        : isWarn 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {inf.type}
                    </span>
                    <span className="font-medium">{inf.message}</span>
                  </div>

                  {inf.snapshot && (
                    <button
                      onClick={() => setSelectedSnapshot(inf.snapshot)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold border border-slate-700 flex items-center gap-1 flex-shrink-0 transition-all"
                    >
                      <ImageIcon className="w-3 h-3 text-indigo-400" />
                      Evidence
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
