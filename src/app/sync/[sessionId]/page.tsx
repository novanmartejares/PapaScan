'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, use } from 'react';
import {
  Camera,
  Layers,
  CreditCard,
  Send,
  CheckCircle2,
  X,
  Upload,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ViewfinderOverlay } from '@/components/scanner/ViewfinderOverlay';
import { compositeIDCardsToA4Page } from '@/lib/cv/id-compositor';

function MobileSyncScannerContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Capture mode
  const [mode, setMode] = useState<'single' | 'batch' | 'id_card'>('single');
  const [idCardStep, setIdCardStep] = useState<'front' | 'back' | 'compositing'>('front');
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null);
  const [shutterPulse, setShutterPulse] = useState(false);

  // 1. Notify desktop that phone is connected
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/sync/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connect' }),
    }).catch((err) => console.error('Failed to notify desktop connect:', err));
  }, [sessionId]);

  // 2. Start Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera failed:', err);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Capture frame
  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(35);
    }

    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

    // ID Card Mode
    if (mode === 'id_card') {
      if (idCardStep === 'front') {
        setIdFrontImage(dataUrl);
        setIdCardStep('back');
      } else if (idCardStep === 'back' && idFrontImage) {
        setIdCardStep('compositing');
        const composite = await compositeIDCardsToA4Page(idFrontImage, dataUrl);
        setCapturedImages((prev) => [...prev, composite.processedImageUrl]);
        setIdCardStep('front');
        setIdFrontImage(null);
      }
      return;
    }

    // Single or Batch
    setCapturedImages((prev) => [...prev, dataUrl]);
  };

  // Send captured pages to desktop
  const handleSendToDesktop = async () => {
    if (capturedImages.length === 0 || !sessionId) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/sync/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_pages',
          images: capturedImages,
        }),
      });

      if (res.ok) {
        setSentSuccess(true);
        setCapturedImages([]);
        setTimeout(() => setSentSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to submit pages:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-between overflow-hidden select-none safe-top safe-bottom">
      {/* Header */}
      <div className="relative z-30 p-4 bg-gradient-to-b from-black/85 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white">PapaScan Mobile Bridge</h1>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Connected to Desktop
            </p>
          </div>
        </div>

        {/* Mode pills */}
        <div className="flex items-center p-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
          <button
            onClick={() => setMode('single')}
            className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
              mode === 'single' ? 'bg-sky-500 text-white' : 'text-slate-400'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
              mode === 'batch' ? 'bg-sky-500 text-white' : 'text-slate-400'
            }`}
          >
            Batch
          </button>
          <button
            onClick={() => setMode('id_card')}
            className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
              mode === 'id_card' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            2-Sided ID
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />

        <ViewfinderOverlay
          aspectRatio={mode === 'id_card' ? 'id_card' : 'document'}
          stepBadge={
            mode === 'id_card'
              ? idCardStep === 'front'
                ? 'STEP 1/2: ID FRONT'
                : 'STEP 2/2: ID BACK'
              : undefined
          }
          guideText={
            mode === 'id_card'
              ? idCardStep === 'front'
                ? 'Align Front of card and tap shutter'
                : 'Flip card to Back side and tap shutter'
              : 'Hold phone steady over document'
          }
        />

        {/* Flash effect */}
        {shutterPulse && (
          <div className="absolute inset-0 bg-white/80 animate-out fade-out duration-200 pointer-events-none" />
        )}
      </div>

      {/* Success banner */}
      {sentSuccess && (
        <div className="absolute top-16 inset-x-4 max-w-sm mx-auto z-40 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-center gap-2 shadow-2xl animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">Sent to Desktop in Real Time!</span>
        </div>
      )}

      {/* Bottom Tray & Shutter */}
      <div className="relative z-30 p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-3">
        {/* Thumbnails strip */}
        {capturedImages.length > 0 && (
          <div className="flex items-center justify-between gap-2 bg-slate-950/80 backdrop-blur-md p-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {capturedImages.map((src, idx) => (
                <div key={idx} className="w-10 h-14 rounded bg-slate-900 border border-slate-700 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Scan preview" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <button
              onClick={handleSendToDesktop}
              disabled={isSending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all shrink-0"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Desktop ({capturedImages.length})</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Shutter bar */}
        <div className="flex items-center justify-center">
          <button
            onClick={captureFrame}
            className="w-18 h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
          >
            <div className="w-full h-full rounded-full bg-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MobileSyncScannerPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400 mr-2" />
          <span>Connecting mobile scanner...</span>
        </div>
      }
    >
      <MobileSyncScannerContent params={params} />
    </Suspense>
  );
}
