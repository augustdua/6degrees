// Supabase Edge Function for sending push notifications via Firebase Cloud Messaging
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

interface NotificationLog {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: any;
  delivery_status: string;
  error_message?: string;
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { userId, title, body, type, data }: NotificationRequest = await req.json();

    if (!userId || !title || !body || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body, type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's push token from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('push_token, push_platform, push_notifications_enabled')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has push notifications enabled and has a token
    if (!userData.push_notifications_enabled || !userData.push_token) {
      console.log('User does not have push notifications enabled or no token');
      return new Response(
        JSON.stringify({ success: false, message: 'User has no push token or notifications disabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      to: userData.push_token,
      notification: {
        title,
        body,
        sound: 'default',
        badge: '1',
      },
      data: {
        type,
        ...data,
      },
      priority: 'high',
      content_available: true,
    };

    // Send notification via FCM
    const fcmResponse = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const fcmResult = await fcmResponse.json();

    // Log notification to database
    const logEntry: NotificationLog = {
      user_id: userId,
      notification_type: type,
      title,
      body,
      data,
      delivery_status: fcmResponse.ok ? 'sent' : 'failed',
      error_message: fcmResponse.ok ? undefined : JSON.stringify(fcmResult),
    };

    await supabase.from('notifications_log').insert(logEntry);

    if (!fcmResponse.ok) {
      console.error('FCM error:', fcmResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send notification', details: fcmResult }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, fcmResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
