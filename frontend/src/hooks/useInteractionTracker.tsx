import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { apiPost } from '@/lib/api';

export type InteractionTargetType = 'forum_post' | 'forum_comment' | 'offer' | 'offer_generation';
export type InteractionEventType =
  | 'view'
  | 'scroll_50'
  | 'scroll_90'
  | 'time_spent'
  | 'reaction'
  | 'comment'
  | 'share'
  | 'click'
  | 'book_click'
  | 'bid_click'
  | 'prompt_submit';

export interface InteractionEvent {
  target_type: InteractionTargetType;
  target_id: string;
  event_type: InteractionEventType;
  duration_ms?: number;
  position?: number;
  metadata?: Record<string, any>;
}

interface TrackerContextType {
  track: (event: InteractionEvent) => void;
}

const TrackerContext = createContext<TrackerContextType | null>(null);

const BATCH_INTERVAL = 5000;
const MAX_BATCH_SIZE = 100;

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem('interaction_session_id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('interaction_session_id', id);
    return id;
  } catch {
    // Fallback: non-persistent session id
    return `sid_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

export const InteractionTrackerProvider = ({ children }: { children: ReactNode }) => {
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const batchRef = useRef<InteractionEvent[]>([]);
  const timerRef = useRef<number | null>(null);

  // Dedupe views within a session
  const seenViewRef = useRef<Set<string>>(new Set());

  const sendBatch = useCallback(async (opts?: { keepalive?: boolean }) => {
    if (batchRef.current.length === 0) return;

    const batch = batchRef.current.slice(0, MAX_BATCH_SIZE);
    batchRef.current = batchRef.current.slice(MAX_BATCH_SIZE);

    const payload = {
      session_id: sessionIdRef.current,
      interactions: batch,
    };

    // Prefer normal authenticated API calls (Authorization header required).
    // Best-effort: if browser supports keepalive, try it for unload/hidden flush.
    if (opts?.keepalive) {
      try {
        // apiPost does not expose keepalive; fall back to fetch with keepalive.
        // We still rely on the existing auth token cache from `api.ts`.
        // NOTE: If keepalive fails, we'll just drop (fire-and-forget).
        const { apiCall } = await import('@/lib/api');
        await apiCall('/api/interactions/track-batch', {
          method: 'POST',
          body: JSON.stringify(payload),
          // @ts-expect-error keepalive is valid in browsers, but RequestInit typing varies
          keepalive: true,
        });
        return;
      } catch {
        // fall through to normal apiPost attempt
      }
    }

    try {
      await apiPost('/api/interactions/track-batch', payload);
    } catch (err) {
      // Fire and forget - tracking should not break UX
      // Intentionally quiet in prod
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('Failed to track interactions:', err);
      }
    }
  }, []);

  const track = useCallback(
    (event: InteractionEvent) => {
      if (!event?.target_type || !event?.target_id || !event?.event_type) return;

      if (event.event_type === 'view') {
        const key = `${event.target_type}:${event.target_id}`;
        if (seenViewRef.current.has(key)) return;
        seenViewRef.current.add(key);
      }

      batchRef.current.push({
        ...event,
        metadata: {
          ...event.metadata,
          timestamp: Date.now(),
          url: window.location.pathname,
        },
      });

      if (batchRef.current.length >= MAX_BATCH_SIZE) {
        void sendBatch();
      }
    },
    [sendBatch]
  );

  useEffect(() => {
    timerRef.current = window.setInterval(() => void sendBatch(), BATCH_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void sendBatch({ keepalive: true });
      }
    };

    const handleUnload = () => {
      // Best-effort flush. Cannot block unload.
      void sendBatch({ keepalive: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleUnload);
      void sendBatch();
    };
  }, [sendBatch]);

  const value = useMemo(() => ({ track }), [track]);

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
};

export const useTracker = () => {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    return { track: () => {} };
  }
  return ctx;
};



