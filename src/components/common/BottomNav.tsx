'use client';

import React from 'react';
import { FolderOpen, Camera, Settings } from 'lucide-react';
import { ViewMode } from '@/types';

interface BottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenScanner,
  onOpenSettings,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 safe-bottom">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto relative">
        {/* Library Tab */}
        <button
          onClick={() => onNavigate('library')}
          className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
            currentView === 'library'
              ? 'text-sky-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[11px]">Library</span>
        </button>

        {/* Floating Scan Button */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={onOpenScanner}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-xl shadow-sky-500/30 active:scale-95 transition-transform flex items-center justify-center text-white ring-4 ring-slate-950"
            aria-label="Start scanning"
          >
            <Camera className="w-7 h-7" />
          </button>
          <span className="text-[10px] font-medium text-sky-400 mt-1">Scan</span>
        </div>

        {/* Settings Tab */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px]">Settings</span>
        </button>
      </div>
    </nav>
  );
};
