'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, FileText, CheckCircle } from 'lucide-react';

interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onCancel: () => void;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  onFilesSelected,
  onCancel,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (filesArray.length > 0) {
        onFilesSelected(filesArray);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (filesArray.length > 0) {
        onFilesSelected(filesArray);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10 scale-102'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h4 className="text-base font-bold text-slate-100">
          Drop your document images here
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Supports multi-file upload for JPG, PNG, WEBP documents and receipts.
        </p>

        <div className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 transition-colors">
          Browse Files
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span>Files stay 100% private in local browser memory</span>
      </div>
    </div>
  );
};
