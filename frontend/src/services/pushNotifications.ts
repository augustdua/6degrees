import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;

  /**
   * Check if push notifications are supported on this platform
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize push notifications
   * - Request permissions
   * - Register for push notifications
   * - Set up listeners
   * - Store token in Supabase
   */
  async initialize(userId: string): Promise<void> {
    if (!this.isSupported()) {
      console.log('Push notifications not supported on this platform');
      return;
    }

    if (this.isInitialized) {
      console.log('Push notifications already initialized');
      return;
    }

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();

      if (permResult.receive === 'granted') {
        console.log('Push notification permission granted');

        // Register for push notifications
        await PushNotifications.register();

        // Set up listeners
        this.setupListeners(userId);

        this.isInitialized = true;
        console.log('Push notifications initialized successfully');
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      throw error;
    }
  }

  /**
   * Set up all push notification listeners
   */
  private setupListeners(userId: string): void {
    // Registration success - save token to database
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.pushToken = token.value;

      try {
        // Save token to Supabase
        await this.saveTokenToDatabase(userId, token.value);
      } catch (error) {
        console.error('Error saving push token:', error);
      }
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration:', error);
    });

    // Push notification received (app in foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received (foreground):', notification);

      // Handle notification received in foreground
      this.handleForegroundNotification(notification);
    });

    // Push notification action performed (user tapped notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);

      // Handle notification tap
      this.handleNotificationTap(notification);
    });
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleForegroundNotification(notification: PushNotificationSchema): void {
    // You can show a toast or custom in-app notification here
    console.log('Foreground notification:', notification.title, notification.body);

    // Extract notification data
    const data = notification.data;

    // You can trigger app state updates here based on notification type
    if (data?.type === 'credit_earned') {
      // Trigger credit update in the app
      console.log('Credits earned notification received');
    } else if (data?.type === 'connection_request') {
      // Trigger connection request list update
      console.log('Connection request notification received');
    }
  }

  /**
   * Handle notification tap (user clicked on notification)
   */
  private handleNotificationTap(notification: ActionPerformed): void {
    console.log('Notification tapped:', notification.notification);

    const data = notification.notification.data;

    // Navigate to appropriate screen based on notification type
    if (data?.type === 'connection_request') {
      // Navigate to connection requests
      window.location.href = '/dashboard?tab=requests';
    } else if (data?.type === 'credit_earned') {
      // Navigate to credits/profile
      window.location.href = '/profile';
    } else if (data?.type === 'chain_update') {
      // Navigate to specific chain
      if (data.chainId) {
        window.location.href = `/chains/${data.chainId}`;
      }
    }
  }

  /**
   * Save push token to Supabase database
   */
  private async saveTokenToDatabase(userId: string, token: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform(); // 'ios' or 'android'

      const { error } = await supabase
        .from('users')
        .update({
          push_token: token,
          push_platform: platform,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error saving push token to database:', error);
        throw error;
      }

      console.log('Push token saved to database successfully');
    } catch (error) {
      console.error('Failed to save push token:', error);
      throw error;
    }
  }

  /**
   * Get current push token
   */
  async getToken(): Promise<string | null> {
    if (!this.isSupported()) {
      return null;
    }

    // Return cached token if available
    if (this.pushToken) {
      return this.pushToken;
    }

    // Otherwise try to get it from the native layer
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      console.log('Delivered notifications:', result);
      return null; // Token retrieval is async via listener
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Remove all delivered notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      await PushNotifications.removeAllDeliveredNotifications();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Unregister from push notifications
   */
  async unregister(userId: string): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      // Remove token from database
      await supabase
        .from('users')
        .update({
          push_token: null,
          push_platform: null,
        })
        .eq('id', userId);

      // Unregister from native platform
      await PushNotifications.removeAllListeners();

      this.pushToken = null;
      this.isInitialized = false;

      console.log('Unregistered from push notifications');
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
