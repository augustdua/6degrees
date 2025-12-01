import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiGet } from '@/lib/api';

export interface NotificationCounts {
  unreadMessages: number;
  pendingConnectionRequests: number;
  acceptedConnections: number;
  pendingOfferApprovals: number;
  pendingIntroRequests: number;
  unreadNotifications: number;
}

const defaultCounts: NotificationCounts = {
  unreadMessages: 0,
  pendingConnectionRequests: 0,
  acceptedConnections: 0,
  pendingOfferApprovals: 0,
  pendingIntroRequests: 0,
  unreadNotifications: 0,
};

export const useNotificationCounts = () => {
  const { user, isReady } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>(defaultCounts);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    // Don't fetch if auth isn't ready or user isn't logged in
    if (!isReady || !user) {
      setCounts(defaultCounts);
      setLoading(false);
      return;
    }

    try {
      console.log('🔔 useNotificationCounts: Fetching counts via backend API...');
      
      // Use backend API instead of direct Supabase queries (which hang in Telegram Mini App)
      const data = await apiGet('/api/notifications/counts');
      
      console.log('🔔 useNotificationCounts: Counts received:', data);

      setCounts({
        unreadMessages: data.unreadMessages || 0,
        pendingConnectionRequests: data.pendingConnectionRequests || 0,
        acceptedConnections: data.acceptedConnections || 0,
        pendingOfferApprovals: data.pendingOfferApprovals || 0,
        pendingIntroRequests: data.pendingIntroRequests || 0,
        unreadNotifications: data.unreadNotifications || 0,
      });
    } catch (error) {
      console.error('❌ Error fetching notification counts:', error);
      // Set zeros on error to prevent hanging
      setCounts(defaultCounts);
    } finally {
      setLoading(false);
    }
  }, [isReady, user]);

  useEffect(() => {
    // Only start fetching when auth is ready
    if (!isReady) {
      return;
    }
    
    // If no user, just set loading to false
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch counts
    fetchCounts();

    // Poll for updates instead of realtime subscriptions (which hang in Telegram Mini App)
    console.log('🔔 useNotificationCounts: Setting up polling (every 30s)...');
    const pollInterval = setInterval(() => {
      console.log('🔔 useNotificationCounts: Polling for updates...');
      fetchCounts();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [isReady, user, fetchCounts]);

  return { counts, loading, refetch: fetchCounts };
};

