interface SyncSession {
  id: string;
  createdAt: number;
  mobileConnected: boolean;
  capturedPages: string[];
  listeners: Array<(event: { type: 'connected' | 'pages'; data: any }) => void>;
}

// In-memory global store across requests in Node process
const globalStore = global as unknown as {
  __papascan_sync_sessions?: Map<string, SyncSession>;
};

if (!globalStore.__papascan_sync_sessions) {
  globalStore.__papascan_sync_sessions = new Map<string, SyncSession>();
}

const sessions = globalStore.__papascan_sync_sessions;

// Clean up stale sessions (> 30 min)
function cleanupStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}

export function getOrCreateSession(sessionId: string): SyncSession {
  cleanupStaleSessions();
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      createdAt: Date.now(),
      mobileConnected: false,
      capturedPages: [],
      listeners: [],
    };
    sessions.set(sessionId, session);
  }
  return session;
}

export function registerSessionListener(
  sessionId: string,
  listener: (event: { type: 'connected' | 'pages'; data: any }) => void
): () => void {
  const session = getOrCreateSession(sessionId);
  session.listeners.push(listener);

  return () => {
    session.listeners = session.listeners.filter((l) => l !== listener);
  };
}

export function notifyMobileConnected(sessionId: string) {
  const session = getOrCreateSession(sessionId);
  session.mobileConnected = true;
  session.listeners.forEach((listener) => {
    try {
      listener({ type: 'connected', data: { connected: true } });
    } catch {}
  });
}

export function submitScannedPages(sessionId: string, images: string[]) {
  const session = getOrCreateSession(sessionId);
  session.capturedPages.push(...images);
  session.listeners.forEach((listener) => {
    try {
      listener({ type: 'pages', data: { images } });
    } catch {}
  });
}

export function getSessionData(sessionId: string) {
  const session = getOrCreateSession(sessionId);
  return {
    id: session.id,
    mobileConnected: session.mobileConnected,
    pagesCount: session.capturedPages.length,
    pages: session.capturedPages,
  };
}
