import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiGet } from '@/lib/api';
import { Send, Link as LinkIcon, Unlink, Check, X, Bell, BellOff, Loader2, ExternalLink } from 'lucide-react';

interface TelegramStatus {
  is_linked: boolean;
  telegram_username?: string;
  telegram_first_name?: string;
  notifications_enabled: boolean;
  linked_at?: string;
}

export function TelegramSettings() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTelegramStatus();
    
    // Check for telegram_token in URL (from /link command)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('telegram_token');
    if (token) {
      handleLinkWithToken(token);
      // Remove token from URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=notifications');
    }
  }, []);

  async function loadTelegramStatus() {
    try {
      setLoading(true);
      const response = await apiGet('/api/telegram/status');
      setStatus(response);
    } catch (error: any) {
      console.error('Error loading Telegram status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Telegram settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkWithToken(token: string) {
    try {
      setActionLoading(true);
      await apiPost('/api/telegram/link', { token });
      
      toast({
        title: 'Telegram Linked! 🎉',
        description: 'Your Telegram account has been successfully connected.'
      });
      
      await loadTelegramStatus();
    } catch (error: any) {
      console.error('Error linking Telegram:', error);
      toast({
        title: 'Linking Failed',
        description: error.message || 'Failed to link Telegram account',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlink() {
    if (!confirm('Are you sure you want to unlink your Telegram account? You will stop receiving notifications.')) {
      return;
    }

    try {
      setActionLoading(true);
      await apiPost('/api/telegram/unlink', {});
      
      toast({
        title: 'Telegram Unlinked',
        description: 'Your Telegram account has been disconnected.'
      });
      
      await loadTelegramStatus();
    } catch (error: any) {
      console.error('Error unlinking Telegram:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlink Telegram account',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleNotifications(enabled: boolean) {
    try {
      setActionLoading(true);
      await apiPost('/api/telegram/toggle-notifications', { enabled });
      
      toast({
        title: enabled ? 'Notifications Enabled' : 'Notifications Disabled',
        description: enabled 
          ? 'You will receive Telegram notifications' 
          : 'Telegram notifications have been turned off'
      });
      
      await loadTelegramStatus();
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function sendTestNotification() {
    try {
      setActionLoading(true);
      await apiPost('/api/telegram/test-notification', {});
      
      toast({
        title: 'Test Sent!',
        description: 'Check your Telegram in a few seconds for the test notification.'
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#0088cc]" />
            Telegram Notifications
          </CardTitle>
          <CardDescription>
            Get instant updates on Telegram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#0088cc]" />
          Telegram Notifications
        </CardTitle>
        <CardDescription>
          Get instant notifications for messages, connections, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Connection Status</Label>
                {status?.is_linked ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <X className="w-3 h-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
              {status?.is_linked && status.telegram_username && (
                <p className="text-sm text-muted-foreground">
                  @{status.telegram_username}
                  {status.telegram_first_name && ` (${status.telegram_first_name})`}
                </p>
              )}
            </div>
            
            {status?.is_linked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-2" />
                )}
                Unlink
              </Button>
            ) : null}
          </div>

          {/* Link Instructions */}
          {!status?.is_linked && (
            <Alert>
              <Send className="h-4 w-4 text-[#0088cc]" />
              <AlertDescription className="ml-2">
                <div className="space-y-3">
                  <p className="font-medium">To link your Telegram account:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open Telegram and search for <strong>@YourBotName</strong></li>
                    <li>Start a chat and send: <code className="bg-muted px-2 py-1 rounded">/start</code></li>
                    <li>Follow the instructions to link your account</li>
                  </ol>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full sm:w-auto bg-[#0088cc] hover:bg-[#0077b5]"
                    onClick={() => window.open('https://t.me/YourBotName', '_blank')}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Open Telegram Bot
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Notifications Toggle */}
          {status?.is_linked && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="telegram-notifications" className="text-base font-medium">
                    Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive instant updates on Telegram
                  </p>
                </div>
                <Switch
                  id="telegram-notifications"
                  checked={status.notifications_enabled}
                  onCheckedChange={toggleNotifications}
                  disabled={actionLoading}
                />
              </div>

              {/* What you'll receive */}
              {status.notifications_enabled && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">You'll receive notifications for:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      New messages
                    </li>
                    <li className="flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      Connection requests
                    </li>
                    <li className="flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      Offer approvals & rejections
                    </li>
                    <li className="flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      New bids on your offers
                    </li>
                  </ul>
                </div>
              )}

              {/* Test Notification Button */}
              {status.notifications_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4 mr-2" />
                  )}
                  Send Test Notification
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <Alert>
          <AlertDescription>
            <p className="text-sm">
              <strong>Why use Telegram?</strong> Get instant notifications with 70%+ open rates,
              quick reply options, and never miss an important message or connection opportunity.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

