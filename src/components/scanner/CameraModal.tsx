'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  Flashlight,
  SwitchCamera,
  Upload,
  Layers,
  FileCheck,
  CreditCard,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ScanBatchItem, CaptureMode } from '@/types';
import { compositeIDCardsToA4Page } from '@/lib/cv/id-compositor';
import { detectDocumentBounds } from '@/lib/cv/document-detector';
import { ViewfinderOverlay } from './ViewfinderOverlay';
import { BatchTray } from './BatchTray';
import { FileUploadDropzone } from './FileUploadDropzone';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (images: string[]) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Capture mode: single, batch, or id_card
  const [captureMode, setCaptureMode] = useState<CaptureMode>('single');
  const [batchItems, setBatchItems] = useState<ScanBatchItem[]>([]);

  // ID Card 2-sided state
  const [idCardStep, setIdCardStep] = useState<'front' | 'back' | 'compositing'>('front');
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null);

  // Smart Document Shoot & Auto-Capture state
  const [smartShootEnabled, setSmartShootEnabled] = useState(true);
  const [isDocumentDetected, setIsDocumentDetected] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);

  // Tab: camera vs upload
  const [tab, setTab] = useState<'camera' | 'upload'>('camera');
  const [shutterPulse, setShutterPulse] = useState(false);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean };
        setTorchSupported(!!capabilities?.torch);
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'Could not access camera. Please allow camera permissions or upload images directly.'
      );
      setCameraActive(false);
      setTab('upload');
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && tab === 'camera') {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, tab, startCamera]);

  // Real-time live document edge detection on video stream (Document Shoot mode)
  useEffect(() => {
    if (!cameraActive || !videoRef.current || tab !== 'camera' || !smartShootEnabled) {
      setIsDocumentDetected(false);
      return;
    }

    const video = videoRef.current;
    let intervalId: NodeJS.Timeout;

    intervalId = setInterval(() => {
      if (video.readyState >= 2 && video.videoWidth > 40) {
        try {
          const detection = detectDocumentBounds(video);
          setIsDocumentDetected(detection.isDocumentDetected);
        } catch {
          // Ignore transient capture hiccups
        }
      }
    }, 320);

    return () => clearInterval(intervalId);
  }, [cameraActive, tab, smartShootEnabled]);

  // Hands-Free Auto-Capture stability timer (CamScanner Smart Scan)
  useEffect(() => {
    if (
      !autoCapture ||
      !isDocumentDetected ||
      !cameraActive ||
      tab !== 'camera' ||
      captureMode === 'id_card' ||
      idCardStep === 'compositing'
    ) {
      setAutoCaptureProgress(0);
      return;
    }

    const timer = setInterval(() => {
      setAutoCaptureProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          captureFrame();
          return 0;
        }
        return prev + 25; // ~1s steady hold to auto-capture
      });
    }, 250);

    return () => clearInterval(timer);
  }, [autoCapture, isDocumentDetected, cameraActive, tab, captureMode, idCardStep]);

  // Reset ID card state when switching modes
  const handleSelectMode = (mode: CaptureMode) => {
    setCaptureMode(mode);
    setIdCardStep('front');
    setIdFrontImage(null);
    setBatchItems([]);
  };

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorch = !torchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch (e) {
      console.error('Torch toggle failed:', e);
    }
  };

  // Switch front/back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame
  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(35);
    }

    // Trigger visual shutter flash
    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Flow 1: ID Card Dual-Sided Mode
    if (captureMode === 'id_card') {
      if (idCardStep === 'front') {
        // Front captured -> prompt for back side
        setIdFrontImage(dataUrl);
        setIdCardStep('back');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }
      } else if (idCardStep === 'back' && idFrontImage) {
        // Back captured -> auto composite into single A4 page
        setIdCardStep('compositing');
        try {
          const a4Composite = await compositeIDCardsToA4Page(idFrontImage, dataUrl);
          // Pass composite A4 page to app
          onCaptureComplete([a4Composite.processedImageUrl]);
        } catch (err) {
          console.error('ID Card composite error:', err);
          // Fallback: pass both pages
          onCaptureComplete([idFrontImage, dataUrl]);
        } finally {
          setIdCardStep('front');
          setIdFrontImage(null);
        }
      }
      return;
    }

    // Flow 2: Batch Mode
    if (captureMode === 'batch') {
      const newItem: ScanBatchItem = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        rawImage: dataUrl,
        timestamp: Date.now(),
      };
      setBatchItems((prev) => [...prev, newItem]);
      return;
    }

    // Flow 3: Single Mode
    onCaptureComplete([dataUrl]);
  };

  // Complete batch scan
  const handleFinishBatch = () => {
    if (batchItems.length === 0) return;
    const images = batchItems.map((item) => item.rawImage);
    setBatchItems([]);
    onCaptureComplete(images);
  };

  // Handle files selected via file uploader
  const handleFilesSelected = (files: File[]) => {
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then(async (dataUrls) => {
      if (captureMode === 'id_card' && dataUrls.length >= 2) {
        // Auto composite first two uploaded images
        const composite = await compositeIDCardsToA4Page(dataUrls[0], dataUrls[1]);
        onCaptureComplete([composite.processedImageUrl]);
      } else {
        onCaptureComplete(dataUrls);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none safe-top safe-bottom">
      {/* Top action bar */}
      <div className="relative z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 to-transparent">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 hover:text-white border border-white/10 active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode selector pills: Single vs Batch vs ID Card */}
        <div className="flex items-center p-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 gap-0.5">
          <button
            onClick={() => handleSelectMode('single')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              captureMode === 'single' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Single
          </button>

          <button
            onClick={() => handleSelectMode('batch')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              captureMode === 'batch' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Batch</span>
            {batchItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/30 text-[10px]">
                {batchItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelectMode('id_card')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              captureMode === 'id_card' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>2-Sided ID</span>
          </button>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5">
          {/* Smart Document Shoot Toggle */}
          {captureMode !== 'id_card' && (
            <button
              onClick={() => setSmartShootEnabled((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold transition-all ${
                smartShootEnabled
                  ? 'bg-amber-500/25 border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'bg-black/50 border-white/10 text-white/50'
              }`}
              title="Toggle Smart Document Shoot Edge Detection"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Doc Shoot</span>
            </button>
          )}

          {/* CamScanner Hands-Free Auto-Capture Toggle */}
          {captureMode !== 'id_card' && (
            <button
              onClick={() => setAutoCapture((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold transition-all ${
                autoCapture
                  ? 'bg-emerald-500/25 border-emerald-400/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-black/50 border-white/10 text-white/50'
              }`}
              title="Toggle Hands-Free Auto-Capture"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{autoCapture ? 'Auto Snap' : 'Manual'}</span>
            </button>
          )}

          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
                torchOn
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-black/50 text-white/90 border-white/10'
              }`}
              title="Torch"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/90 hover:text-white border border-white/10 transition-colors"
            title="Flip camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {tab === 'camera' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Viewfinder overlay */}
            <ViewfinderOverlay
              aspectRatio={captureMode === 'id_card' ? 'id_card' : 'document'}
              isDocumentDetected={isDocumentDetected}
              smartShootEnabled={smartShootEnabled}
              autoCapture={autoCapture}
              autoCaptureProgress={autoCaptureProgress}
              stepBadge={
                captureMode === 'id_card'
                  ? idCardStep === 'front'
                    ? 'STEP 1 OF 2: ID FRONT'
                    : idCardStep === 'back'
                    ? 'STEP 2 OF 2: ID BACK'
                    : 'COMPOSITING A4 PAGE...'
                  : undefined
              }
              guideText={
                captureMode === 'id_card'
                  ? idCardStep === 'front'
                    ? 'Position FRONT of card inside the frame & tap shutter'
                    : idCardStep === 'back'
                    ? 'FLIP CARD OVER! Position BACK of card & tap shutter'
                    : 'Compositing both sides onto single A4 sheet...'
                  : undefined
              }
            />

            {/* Compositing Loading Overlay */}
            {idCardStep === 'compositing' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-50 animate-in fade-in">
                <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
                <span className="text-sm font-bold text-white">Compositing Front & Back into A4 Sheet...</span>
              </div>
            )}

            {/* Shutter visual flash animation */}
            {shutterPulse && (
              <div className="absolute inset-0 bg-white/80 animate-out fade-out duration-200 z-40 pointer-events-none" />
            )}
          </div>
        ) : (
          <FileUploadDropzone
            onFilesSelected={handleFilesSelected}
            onCancel={() => setTab('camera')}
          />
        )}
      </div>

      {/* ID Card Front Thumbnail Banner (when waiting for back side) */}
      {captureMode === 'id_card' && idCardStep === 'back' && idFrontImage && (
        <div className="absolute bottom-28 inset-x-4 max-w-sm mx-auto z-30 bg-slate-950/90 backdrop-blur-xl border border-indigo-500/40 p-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-8 rounded bg-slate-900 border border-slate-700 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idFrontImage} alt="ID Front Preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400">✓ Front Captured</span>
              <p className="text-[10px] text-slate-400">Now flip card to capture Back</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIdCardStep('front');
              setIdFrontImage(null);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retake</span>
          </button>
        </div>
      )}

      {/* Batch thumbnail tray */}
      {captureMode === 'batch' && (
        <BatchTray
          items={batchItems}
          onRemoveItem={(id) => setBatchItems((prev) => prev.filter((i) => i.id !== id))}
          onFinishBatch={handleFinishBatch}
        />
      )}

      {/* Bottom control bar */}
      <div className="relative z-30 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-around max-w-lg mx-auto w-full">
        {/* Switch to upload */}
        <button
          onClick={() => setTab(tab === 'camera' ? 'upload' : 'camera')}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors"
        >
          {tab === 'camera' ? (
            <>
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">Upload</span>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">Camera</span>
            </>
          )}
        </button>

        {/* Shutter Button with Auto-Capture circular progress ring */}
        {tab === 'camera' && (
          <div className="relative flex items-center justify-center">
            {autoCapture && autoCaptureProgress > 0 && (
              <svg className="absolute w-[94px] h-[94px] pointer-events-none -rotate-90">
                <circle
                  cx="47"
                  cy="47"
                  r="43"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="47"
                  cy="47"
                  r="43"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="270"
                  strokeDashoffset={270 - (270 * autoCaptureProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />
              </svg>
            )}
            <button
              onClick={captureFrame}
              disabled={idCardStep === 'compositing'}
              className="group relative w-20 h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
              aria-label="Capture photo"
            >
              <div
                className={`w-full h-full rounded-full transition-colors flex items-center justify-center shadow-lg ${
                  captureMode === 'id_card'
                    ? 'bg-gradient-to-tr from-indigo-500 to-sky-400 group-hover:from-indigo-400 group-hover:to-sky-300'
                    : 'bg-white group-hover:bg-sky-400'
                }`}
              />
            </button>
          </div>
        )}

        {/* Batch Review / ID Card Badge */}
        {captureMode === 'batch' ? (
          <button
            onClick={handleFinishBatch}
            disabled={batchItems.length === 0}
            className={`flex flex-col items-center gap-1 transition-opacity ${
              batchItems.length > 0 ? 'text-sky-400 font-semibold' : 'text-slate-600 opacity-40'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px]">Save ({batchItems.length})</span>
          </button>
        ) : captureMode === 'id_card' ? (
          <div className="flex flex-col items-center gap-1 text-indigo-400 font-semibold text-[11px]">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span>{idCardStep === 'front' ? '1/2 Front' : '2/2 Back'}</span>
          </div>
        ) : (
          <div className="w-11" />
        )}
      </div>
    </div>
  );
};
