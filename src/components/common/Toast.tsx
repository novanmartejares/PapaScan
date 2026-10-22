'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-5 inset-x-4 max-w-sm mx-auto z-50 animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={`flex items-center justify-between p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            : toast.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
            : 'bg-slate-900/90 border-sky-500/30 text-sky-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
          <span className="text-sm font-medium leading-snug">{toast.text}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
