import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateSession,
  registerSessionListener,
  notifyMobileConnected,
  submitScannedPages,
  getSessionData,
} from '@/lib/sync/session-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const isSSE = request.headers.get('accept') === 'text/event-stream';

  if (!isSSE) {
    // Standard JSON poll
    const data = getSessionData(sessionId);
    return NextResponse.json(data);
  }

  // Real-Time Server-Sent Events (SSE) stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately
      const initialData = getSessionData(sessionId);
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify(initialData)}\n\n`)
      );

      // Register listener for mobile connect & page submissions
      const unsubscribe = registerSessionListener(sessionId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
          );
        } catch (e) {
          // Stream closed
          unsubscribe();
        }
      });

      // Keepalive ping every 15s to keep connection alive through proxies
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
          unsubscribe();
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const body = await request.json();

    if (body.action === 'connect') {
      notifyMobileConnected(sessionId);
      return NextResponse.json({ success: true, status: 'connected' });
    }

    if (body.action === 'submit_pages' && Array.isArray(body.images)) {
      submitScannedPages(sessionId, body.images);
      return NextResponse.json({
        success: true,
        receivedCount: body.images.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
