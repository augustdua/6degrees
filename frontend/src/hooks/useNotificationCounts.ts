import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '@/lib/api';

export interface NotificationCounts {
  unreadMessages: number;
  pendingConnectionRequests: number;
  acceptedConnections: number;
  pendingOfferApprovals: number;
  pendingIntroRequests: number;
  unreadNotifications: number;
}

export const useNotificationCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadMessages: 0,
    pendingConnectionRequests: 0,
    acceptedConnections: 0,
    pendingOfferApprovals: 0,
    pendingIntroRequests: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) {
      setCounts({
        unreadMessages: 0,
        pendingConnectionRequests: 0,
        acceptedConnections: 0,
        pendingOfferApprovals: 0,
        pendingIntroRequests: 0,
        unreadNotifications: 0,
      });
      setLoading(false);
      return;
    }

    try {
      console.log('🔔 useNotificationCounts: Fetching counts via backend API...');
      
      // Use backend API instead of direct Supabase queries (which hang in Telegram Mini App)
      const response = await fetch(`${API_BASE_URL}/api/notifications/counts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
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
      setCounts({
        unreadMessages: 0,
        pendingConnectionRequests: 0,
        acceptedConnections: 0,
        pendingOfferApprovals: 0,
        pendingIntroRequests: 0,
        unreadNotifications: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Poll for updates instead of realtime subscriptions (which hang in Telegram Mini App)
    if (!user) return;

    console.log('🔔 useNotificationCounts: Setting up polling (every 30s)...');
    const pollInterval = setInterval(() => {
      console.log('🔔 useNotificationCounts: Polling for updates...');
      fetchCounts();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [user]);

  return { counts, loading, refetch: fetchCounts };
};

