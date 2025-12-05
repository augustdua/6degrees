import { useEffect, useRef, useCallback } from 'react';
import { apiPost } from '@/lib/api';

interface Interaction {
  type: 'view' | 'scroll_50' | 'scroll_90' | 'time_spent' | 'reaction' | 'poll_vote' | 'poll_generate' | 'share';
  post_id?: string;
  poll_id?: string;
  community_id?: string;
  metadata?: Record<string, any>;
}

const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 100;

export const useForumInteractionTracker = () => {
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

  // Track post view
  const trackView = useCallback((postId: string, communityId?: string) => {
    if (viewedPostsRef.current.has(postId)) return;
    viewedPostsRef.current.add(postId);

    trackInteraction({
      type: 'view',
      post_id: postId,
      community_id: communityId,
      metadata: { source: 'feed' }
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

  // Track share
  const trackShare = useCallback((postId: string, communityId?: string) => {
    trackInteraction({
      type: 'share',
      post_id: postId,
      community_id: communityId
    });
  }, [trackInteraction]);

  // Track poll vote
  const trackPollVote = useCallback((postId: string, pollId: string, optionIndex: number) => {
    trackInteraction({
      type: 'poll_vote',
      post_id: postId,
      poll_id: pollId,
      metadata: { option_index: optionIndex }
    });
  }, [trackInteraction]);

  // Set up batch timer
  useEffect(() => {
    timerRef.current = setInterval(sendBatch, BATCH_INTERVAL);

    // Send on page unload
    const handleUnload = () => {
      if (batchRef.current.length > 0) {
        // Use sendBeacon for reliability on unload
        const data = JSON.stringify({ interactions: batchRef.current });
        navigator.sendBeacon('/api/forum/track-batch', data);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      window.removeEventListener('beforeunload', handleUnload);
      // Send remaining batch
      sendBatch();
    };
  }, [sendBatch]);

  return {
    trackView,
    trackScroll,
    trackTimeSpent,
    trackShare,
    trackPollVote,
    trackInteraction
  };
};

