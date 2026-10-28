import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  CheckCircle, 
  AlertTriangle, 
  Send, 
  Maximize, 
  ShieldAlert, 
  HelpCircle 
} from 'lucide-react';
import { mockQuestions } from '../data/mockQuestions';
import { soundEffects } from '../utils/soundEffects';

export default function ExamInterface({ 
  sessionId, 
  candidateName, 
  candidateId, 
  onSubmitExam, 
  onClientViolation 
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState(1500); // 25 minutes in seconds
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const currentQ = mockQuestions[currentIdx];

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Fullscreen and Tab Integrity listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        soundEffects.playCriticalAlarm();
        onClientViolation("FULLSCREEN_EXIT", "Candidate exited required fullscreen lock-down mode");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setTabSwitchWarning(true);
        soundEffects.playCriticalAlarm();
        onClientViolation("TAB_SWITCH", `Candidate switched away from exam tab or minimized browser window (Count: ${tabSwitchCount + 1})`);
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        onClientViolation("TAB_SWITCH", "Candidate focused outside exam window / split screen attempt");
      }
    };

    const handleKeyDown = (e) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'a', 'u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        soundEffects.playWarningBeep();
        onClientViolation("KEY_VIOLATION", `Attempted prohibited shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      onClientViolation("KEY_VIOLATION", "Attempted right-click context menu inspection");
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [tabSwitchCount]);

  const enterFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }
  };

  const handleSelectOption = (idx) => {
    setAnswers({
      ...answers,
      [currentQ.id]: idx
    });
  };

  const handleToggleFlag = () => {
    setFlagged({
      ...flagged,
      [currentQ.id]: !flagged[currentQ.id]
    });
  };

  const handleSubmit = () => {
    if (onSubmitExam) {
      onSubmitExam(answers);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden relative">
      
      {/* Fullscreen Violation Lock Overlay */}
      {!isFullscreen && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">EXAM LOCKED: FULLSCREEN REQUIRED</h2>
          <p className="text-sm text-slate-400 max-w-md">
            You exited fullscreen mode. This event has been permanently recorded in the proctor audit log. Click below to return immediately.
          </p>
          <button
            onClick={enterFullscreen}
            className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-red-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Maximize className="w-4 h-4" />
            Resume Fullscreen Exam
          </button>
        </div>
      )}

      {/* Tab Switch Warning Modal */}
      {tabSwitchWarning && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">TAB SWITCH DETECTED!</h3>
          <p className="text-xs text-slate-300 max-w-md">
            You switched tabs or minimized the browser window. Our proctor engine has logged this infraction. Continued breaches will result in automatic disqualification.
          </p>
          <div className="text-xs font-semibold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
            Total Tab Violations: {tabSwitchCount}
          </div>
          <button
            onClick={() => setTabSwitchWarning(false)}
            className="mt-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all"
          >
            I Understand & Return to Exam
          </button>
        </div>
      )}

      {/* Exam Header */}
      <div className="p-4 md:px-6 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Assessment Section 1
          </span>
          <h1 className="text-base font-bold text-white">
            Senior Software Engineering & AI Certification
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-bold ${
            timeLeft < 300 
              ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse' 
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}>
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={handleSubmit}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
          >
            <Send className="w-3.5 h-3.5" />
            Finish & Submit
          </button>
        </div>
      </div>

      {/* Question Navigation Bar (1 to 8) */}
      <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Questions:
        </span>
        {mockQuestions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isFlagged = flagged[q.id];
          const isCurrent = idx === currentIdx;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center ${
                isCurrent
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                  : isAnswered
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-slate-950" />
              )}
            </button>
          );
        })}
      </div>

      {/* Question Body */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Question {currentIdx + 1} of {mockQuestions.length} &bull; {currentQ.title}
          </span>
          <button
            onClick={handleToggleFlag}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-all ${
              flagged[currentQ.id]
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            {flagged[currentQ.id] ? 'Flagged for Review' : 'Mark for Review'}
          </button>
        </div>

        <h2 className="text-lg md:text-xl font-semibold text-white leading-relaxed">
          {currentQ.question}
        </h2>

        {/* Options */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((opt, oIdx) => {
            const isSelected = answers[currentQ.id] === oIdx;
            return (
              <button
                key={oIdx}
                onClick={() => handleSelectOption(oIdx)}
                className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-400 group-hover:border-slate-600'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </div>
                  <span className="font-medium">{opt}</span>
                </div>
                {isSelected && <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Footer Controls */}
      <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Question
        </button>

        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          Answered {Object.keys(answers).length} of {mockQuestions.length} Questions
        </div>

        <button
          onClick={() => setCurrentIdx(prev => Math.min(mockQuestions.length - 1, prev + 1))}
          disabled={currentIdx === mockQuestions.length - 1}
          className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
        >
          Next Question
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
