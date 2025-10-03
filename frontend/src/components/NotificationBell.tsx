import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    chain_id?: string;
    request_id?: string;
    hours_since_joined?: number;
  };
  is_read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click (chain reminders have special actions)
  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);

    if (notification.type === 'chain_reminder' && notification.data.request_id) {
      // Navigate to the request details page where they can share their link
      navigate(`/request/${notification.data.request_id}`);
    }
  };

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // TEMPORARY: Manual sound test (REMOVE LATER)
  const testNotificationSound = () => {
    console.log('🔊 Testing notification sound...');

    // Show test toast
    toast({
      title: "🔊 Sound Test",
      description: "Sound functionality disabled for iOS compatibility",
    });
  };


  // Share link action for chain reminders
  const handleShareLink = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!notification.data.request_id) return;

    try {
      // This would need to be implemented - get user's personal shareable link
      // For now, just show a toast
      toast({
        title: "Share Your Link",
        description: "Click to go to your request details and copy your personal shareable link.",
      });

      navigate(`/request/${notification.data.request_id}`);
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification if permission granted
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
                silent: true, // Use silent to prevent audio issues on iOS
              });
            } catch (error) {
              // Ignore notification errors on incompatible devices
            }
          }

          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast]);

  // Check if we're on iOS Safari
  const isIOSSafari = () => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  };

  // Request notification permission (user-initiated only)
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === 'default') {
      try {
        // Special handling for iOS Safari
        if (isIOSSafari()) {
          toast({
            title: "iOS Notifications",
            description: "Please enable notifications in Safari Settings > Website Settings > Notifications for this site.",
            duration: 5000,
          });
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive notifications for new messages and updates.",
          });
        } else {
          toast({
            title: "Notifications Disabled",
            description: "You can enable notifications later in your browser settings.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast({
          title: "Permission Error",
          description: "Unable to request notification permission.",
          variant: "destructive",
        });
      }
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex gap-2">
                {/* Notification permission button */}
                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                    className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    🔔 {isIOSSafari() ? 'iOS Settings' : 'Enable Notifications'}
                  </Button>
                )}
                {/* TEMPORARY: Sound test button (REMOVE LATER) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testNotificationSound}
                  className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                >
                  🔊 Test Sound
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(notification.created_at)}
                            </div>
                            {notification.type === 'chain_reminder' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => handleShareLink(notification, e)}
                              >
                                <Share2 className="h-3 w-3 mr-1" />
                                Share Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;