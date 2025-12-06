import { useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { apiPost } from '@/lib/api';

interface Interaction {
  type: 'view' | 'scroll_50' | 'scroll_90' | 'time_spent' | 'reaction' | 'comment' | 'share';
  post_id?: string;
  comment_id?: string;
  community_id?: string;
  metadata?: Record<string, any>;
}

const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 100;

interface TrackerContextType {
  trackView: (postId: string, communityId?: string, metadata?: Record<string, any>) => void;
  trackReaction: (postId: string, communityId?: string, metadata?: Record<string, any>) => void;
  trackComment: (postId: string, commentId: string, communityId?: string) => void;
  trackShare: (postId: string, communityId?: string, metadata?: Record<string, any>) => void;
  trackScroll: (postId: string, depth: number, communityId?: string) => void;
  trackTimeSpent: (postId: string, timeMs: number, communityId?: string) => void;
}

const TrackerContext = createContext<TrackerContextType | null>(null);

// Hook to use the tracker from any component
export const useForumTracker = () => {
  const context = useContext(TrackerContext);
  if (!context) {
    // Return no-op functions if used outside provider (graceful fallback)
    return {
      trackView: () => {},
      trackReaction: () => {},
      trackComment: () => {},
      trackShare: () => {},
      trackScroll: () => {},
      trackTimeSpent: () => {},
    };
  }
  return context;
};

// Provider component that manages the batch
export const ForumTrackerProvider = ({ children }: { children: ReactNode }) => {
  const batchRef = useRef<Interaction[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const scrolledPostsRef = useRef<Map<string, number>>(new Map());

  // Send batch to server
  const sendBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = batchRef.current.slice(0, MAX_BATCH_SIZE);
    batchRef.current = batchRef.current.slice(MAX_BATCH_SIZE);

    try {
      await apiPost('/api/forum/track-batch', { interactions: batch });
    } catch (err) {
      // Fire and forget - don't fail the UX
      console.debug('Failed to track interactions:', err);
    }
  }, []);

  // Send batch using beacon (for unload/visibility change)
  const sendBatchBeacon = useCallback(() => {
    if (batchRef.current.length === 0) return;
    
    const data = JSON.stringify({ interactions: batchRef.current });
    navigator.sendBeacon('/api/forum/track-batch', data);
    batchRef.current = []; // Clear after sending
  }, []);

  // Add interaction to batch
  const trackInteraction = useCallback((interaction: Interaction) => {
    batchRef.current.push({
      ...interaction,
      metadata: {
        ...interaction.metadata,
        timestamp: Date.now(),
        url: window.location.pathname
      }
    });

    // If batch is full, send immediately
    if (batchRef.current.length >= MAX_BATCH_SIZE) {
      sendBatch();
    }
  }, [sendBatch]);

  // Track post view (deduplicated)
  const trackView = useCallback((postId: string, communityId?: string, metadata?: Record<string, any>) => {
    if (viewedPostsRef.current.has(postId)) return;
    viewedPostsRef.current.add(postId);

    trackInteraction({
      type: 'view',
      post_id: postId,
      community_id: communityId,
      metadata: { source: 'feed', ...metadata }
    });
  }, [trackInteraction]);

  // Track reaction (upvote, downvote, emoji, save)
  const trackReaction = useCallback((postId: string, communityId?: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'reaction',
      post_id: postId,
      community_id: communityId,
      metadata
    });
  }, [trackInteraction]);

  // Track comment submission
  const trackComment = useCallback((postId: string, commentId: string, communityId?: string) => {
    trackInteraction({
      type: 'comment',
      post_id: postId,
      comment_id: commentId,
      community_id: communityId
    });
  }, [trackInteraction]);

  // Track share
  const trackShare = useCallback((postId: string, communityId?: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'share',
      post_id: postId,
      community_id: communityId,
      metadata
    });
  }, [trackInteraction]);

  // Track scroll depth
  const trackScroll = useCallback((postId: string, depth: number, communityId?: string) => {
    const currentDepth = scrolledPostsRef.current.get(postId) || 0;
    
    if (depth >= 0.5 && currentDepth < 0.5) {
      scrolledPostsRef.current.set(postId, 0.5);
      trackInteraction({
        type: 'scroll_50',
        post_id: postId,
        community_id: communityId,
        metadata: { scroll_depth: 0.5 }
      });
    }
    
    if (depth >= 0.9 && currentDepth < 0.9) {
      scrolledPostsRef.current.set(postId, 0.9);
      trackInteraction({
        type: 'scroll_90',
        post_id: postId,
        community_id: communityId,
        metadata: { scroll_depth: 0.9 }
      });
    }
  }, [trackInteraction]);

  // Track time spent
  const trackTimeSpent = useCallback((postId: string, timeMs: number, communityId?: string) => {
    trackInteraction({
      type: 'time_spent',
      post_id: postId,
      community_id: communityId,
      metadata: { time_spent_ms: timeMs }
    });
  }, [trackInteraction]);

  // Set up batch timer and event listeners
  useEffect(() => {
    // Timer-based flush every 5 seconds
    timerRef.current = setInterval(sendBatch, BATCH_INTERVAL);

    // Flush on page unload (user closing tab/navigating away)
    const handleUnload = () => {
      sendBatchBeacon();
    };

    // Flush on visibility change (user switching tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User just left the tab - flush immediately!
        sendBatchBeacon();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Send remaining batch on unmount
      sendBatch();
    };
  }, [sendBatch, sendBatchBeacon]);

  const value: TrackerContextType = {
    trackView,
    trackReaction,
    trackComment,
    trackShare,
    trackScroll,
    trackTimeSpent,
  };

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
};

// Legacy hook for backwards compatibility (just initializes, doesn't return anything useful now)
export const useForumInteractionTracker = () => {
  // This is now deprecated - use ForumTrackerProvider + useForumTracker instead
  return {};
};
