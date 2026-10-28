import React from 'react';
import { ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export default function AlertBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.slice(-3).map((alert) => {
        const isCritical = alert.severity === 'critical';
        const isWarning = alert.severity === 'warning';

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
              isCritical
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : isWarning
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isCritical ? (
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <div className="font-bold uppercase tracking-wider text-[10px] opacity-80">
                  {alert.type} Violation
                </div>
                <div className="font-medium mt-0.5">{alert.message}</div>
              </div>
            </div>

            <button
              onClick={() => onDismiss && onDismiss(alert.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
