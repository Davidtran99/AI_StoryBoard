/**
 * Simple toast host aligned with project styling.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  timeout: number;
}

const genId = () => Math.random().toString(36).slice(2);

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Record<string, any>>({});

  useEffect(() => {
    // Expose global toast helper
    (window as any).toast = (message: string, type: ToastType = 'info', timeout = 3500) => {
      const id = genId();
      setToasts(prev => {
        const next = [...prev, { id, message, type, timeout }];
        return next.slice(-3); // keep last 3
      });
      timeouts.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        clearTimeout(timeouts.current[id]);
        delete timeouts.current[id];
      }, timeout);
    };
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
      timeouts.current = {};
      delete (window as any).toast;
    };
  }, []);

  const typeStyles: Record<ToastType, {wrap: string; icon: string; ring: string}> = useMemo(() => ({
    info:    { wrap: 'border-slate-700 text-slate-100',  icon: 'text-teal-300',   ring: 'ring-1 ring-teal-500/30' },
    success: { wrap: 'border-green-700 text-green-100', icon: 'text-green-300',  ring: 'ring-1 ring-green-500/30' },
    warning: { wrap: 'border-yellow-700 text-yellow-100', icon: 'text-yellow-300', ring: 'ring-1 ring-yellow-500/30' },
    error:   { wrap: 'border-red-700 text-red-100',     icon: 'text-red-300',    ring: 'ring-1 ring-red-500/30' },
  }), []);

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto max-w-sm w-[360px] rounded-xl border ${typeStyles[t.type].wrap} ${typeStyles[t.type].ring} bg-slate-900/90 shadow-[0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-md px-4 py-3 animate-in fade-in-0 slide-in-from-top-2 duration-200`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' ? <CheckCircle className={`h-5 w-5 ${typeStyles[t.type].icon}`} />
               : t.type === 'warning' ? <AlertTriangle className={`h-5 w-5 ${typeStyles[t.type].icon}`} />
               : t.type === 'error' ? <XCircle className={`h-5 w-5 ${typeStyles[t.type].icon}`} />
               : <Info className={`h-5 w-5 ${typeStyles[t.type].icon}`} />}
            </div>
            <div className="text-sm leading-relaxed flex-1">{t.message}</div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-2 rounded-md p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};


