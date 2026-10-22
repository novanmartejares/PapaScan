'use client';

import React from 'react';
import { ScanLine, Camera, Upload, Plus } from 'lucide-react';

interface EmptyStateProps {
  onOpenScanner: () => void;
  onTriggerUpload: () => void;
  isFiltered?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenScanner,
  onTriggerUpload,
  isFiltered = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 max-w-lg mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
        <ScanLine className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-100">
        {isFiltered ? 'No matching documents found' : 'Your Document Library is Empty'}
      </h3>

      <p className="text-xs sm:text-sm text-slate-400 max-w-xs mt-1.5 mb-6 leading-relaxed">
        {isFiltered
          ? 'Try adjusting your search keywords or clear your category filter.'
          : 'Capture receipts, IDs, notes, or multi-page contracts using your camera or upload an image.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onOpenScanner}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Start Camera Scan</span>
        </button>

        <button
          onClick={onTriggerUpload}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
        >
          <Upload className="w-4 h-4 text-sky-400" />
          <span>Upload File</span>
        </button>
      </div>
    </div>
  );
};
