import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api';

export interface SwipeableUser {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_picture_url?: string;
  social_capital_score: number;
  mutual_orgs_count: number;
  connection_stories: Array<{
    id: string;
    photo_url: string;
    story?: string;
    featured_connection_name?: string;
  }>;
}

export interface Match {
  match_id: string;
  matched_user_id: string;
  matched_user_name: string;
  matched_user_photo?: string;
  matched_user_score: number;
  matched_at: string;
  status: string;
  call_scheduled_at?: string;
}

export interface SwipeStats {
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  matches: number;
  calls_scheduled: number;
  match_rate: string;
}

export const usePeopleMatching = () => {
  const [swipeableUsers, setSwipeableUsers] = useState<SwipeableUser[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<SwipeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newMatch, setNewMatch] = useState<Match | null>(null);

  // Fetch swipeable users
  const fetchSwipeableUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/people-matching/swipeable?limit=20', { skipCache: true });
      setSwipeableUsers(data.users || []);
      setCurrentIndex(0);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching swipeable users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      const data = await apiGet('/api/people-matching/matches', { skipCache: true });
      setMatches(data.matches || []);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet('/api/people-matching/stats', { skipCache: true });
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchSwipeableUsers();
    fetchMatches();
    fetchStats();
  }, [fetchSwipeableUsers, fetchMatches, fetchStats]);

  // Record a swipe
  const swipe = async (direction: 'left' | 'right') => {
    const currentUser = swipeableUsers[currentIndex];
    if (!currentUser) return null;

    try {
      const result = await apiPost('/api/people-matching/swipe', {
        swiped_id: currentUser.id,
        direction
      });

      // Move to next user
      setCurrentIndex(prev => prev + 1);

      // If it's a match, show the match modal
      if (result.is_match && result.match) {
        setNewMatch({
          match_id: result.match.id,
          matched_user_id: currentUser.id,
          matched_user_name: `${currentUser.first_name} ${currentUser.last_name}`,
          matched_user_photo: currentUser.profile_picture_url,
          matched_user_score: currentUser.social_capital_score,
          matched_at: result.match.matched_at,
          status: result.match.status
        });
        fetchMatches();
        fetchStats();
      }

      // Refetch if running low on users
      if (currentIndex >= swipeableUsers.length - 3) {
        fetchSwipeableUsers();
      }

      return result;
    } catch (err: any) {
      console.error('Error recording swipe:', err);
      throw err;
    }
  };

  // Undo last swipe
  const undoSwipe = async () => {
    try {
      await apiPost('/api/people-matching/swipe/undo');
      // Go back one
      setCurrentIndex(prev => Math.max(0, prev - 1));
      fetchSwipeableUsers();
    } catch (err: any) {
      console.error('Error undoing swipe:', err);
      throw err;
    }
  };

  // Clear new match (after user dismisses modal)
  const clearNewMatch = () => {
    setNewMatch(null);
  };

  // Get current user to display
  const currentUser = swipeableUsers[currentIndex] || null;
  const hasMoreUsers = currentIndex < swipeableUsers.length;

  return {
    currentUser,
    hasMoreUsers,
    swipeableUsers,
    matches,
    stats,
    loading,
    error,
    newMatch,
    swipe,
    undoSwipe,
    clearNewMatch,
    fetchSwipeableUsers,
    fetchMatches,
    fetchStats
  };
};

export default usePeopleMatching;

