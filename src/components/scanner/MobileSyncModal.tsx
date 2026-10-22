'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Wifi,
  Sparkles,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceivedPages: (images: string[]) => void;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
  isOpen,
  onClose,
  onReceivedPages,
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [isMobileConnected, setIsMobileConnected] = useState<boolean>(false);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize unique session ID and generate QR code
  useEffect(() => {
    if (!isOpen) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const newSessionId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    setSessionId(newSessionId);
    setIsMobileConnected(false);
    setReceivedCount(0);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const targetUrl = `${origin}/sync/${newSessionId}`;
    setSyncUrl(targetUrl);

    // Generate high-contrast QR code
    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));

    // Connect to Server-Sent Events (SSE)
    const sse = new EventSource(`/api/sync/${newSessionId}`);
    eventSourceRef.current = sse;

    sse.addEventListener('connected', () => {
      setIsMobileConnected(true);
    });

    sse.addEventListener('pages', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.images && Array.isArray(payload.images)) {
          setReceivedCount((prev) => prev + payload.images.length);
          try {
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {}
          onReceivedPages(payload.images);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    });

    sse.onerror = () => {
      // Fallback: poll every 1.5 seconds if SSE disconnects
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/sync/${newSessionId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.mobileConnected) {
                setIsMobileConnected(true);
              }
              if (data.pages && data.pages.length > receivedCount) {
                const newPages = data.pages.slice(receivedCount);
                setReceivedCount(data.pages.length);
                onReceivedPages(newPages);
              }
            }
          } catch {}
        }, 1500);
      }
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, onReceivedPages, receivedCount]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleOpenSimulatorTab = () => {
    window.open(syncUrl, '_blank', 'width=412,height=869');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan with Phone</h3>
              <p className="text-xs text-slate-400">Use your mobile camera for scanning</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center justify-center">
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isMobileConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
            }`}
          >
            {isMobileConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Phone Connected & Ready!</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Waiting for mobile scan...</span>
              </>
            )}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="relative mx-auto w-64 h-64 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-4 border-slate-800">
          {qrCodeDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCodeDataUrl}
              alt="Scan session QR Code"
              className="w-full h-full object-contain"
            />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          )}

          {/* Connected watermark overlay */}
          {isMobileConnected && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center gap-2 text-white p-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <span className="text-sm font-bold">Mobile Active</span>
              <p className="text-[11px] text-emerald-200">
                Capture pages on phone — they will land here automatically!
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Open the camera on your iPhone or Android, aim at the QR code, and tap the link to begin.
        </p>

        {/* Copy link or test simulator tab */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Mobile Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenSimulatorTab}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-colors"
            title="Open phone view in separate window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Phone Tab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
