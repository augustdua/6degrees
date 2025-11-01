import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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
      // 1. Unread messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      // 2. Pending connection requests (incoming)
      const { count: connectionRequestsCount } = await supabase
        .from('user_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user2_id', user.id)
        .eq('status', 'pending');

      // 3. Recently accepted connections (last 24 hours, not yet viewed)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: acceptedConnectionsCount } = await supabase
        .from('user_connections')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .gte('updated_at', twentyFourHoursAgo);

      // 4. Pending offer approval requests (offers waiting for my approval)
      const { count: offerApprovalsCount } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('connection_user_id', user.id)
        .eq('status', 'pending_approval')
        .eq('approved_by_target', false);

      // 5. Pending intro call requests (where I'm creator or target)
      const { count: pendingIntrosCount } = await supabase
        .from('intro_calls')
        .select('*', { count: 'exact', head: true })
        .or(`creator_id.eq.${user.id},target_id.eq.${user.id}`)
        .eq('status', 'pending');

      // 6. Unread notifications
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      setCounts({
        unreadMessages: messagesCount || 0,
        pendingConnectionRequests: connectionRequestsCount || 0,
        acceptedConnections: acceptedConnectionsCount || 0,
        pendingOfferApprovals: offerApprovalsCount || 0,
        pendingIntroRequests: pendingIntrosCount || 0,
        unreadNotifications: notificationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Subscribe to realtime updates
    if (!user) return;

    const messagesChannel = supabase
      .channel('notification-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_connections',
        },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `connection_user_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_calls',
        },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [user]);

  return { counts, loading, refetch: fetchCounts };
};

