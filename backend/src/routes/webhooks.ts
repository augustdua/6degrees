/**
 * Webhook Routes
 * Handles webhooks from external services (Daily.co, Razorpay, Cal.com, etc.)
 */

import express, { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { json } from 'express';

const router = express.Router();


/**
 * Daily.co recording webhook
 * POST /webhooks/daily/recording
 */
router.post('/daily/recording', async (req: Request, res: Response) => {
  try {
    const { room_name, recording_id, download_link, duration } = req.body;

    console.log('🎥 Recording ready:');
    console.log(`   Room: ${room_name}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Download: ${download_link}`);

    // Extract call_id from room name (format: paynet-call-{callId})
    const callId = room_name.replace('paynet-call-', '');

    // Update call with recording URL
    await supabase
      .from('intro_calls')
      .update({
        recording_url: download_link,
        duration_minutes: Math.floor(duration / 60)
      })
      .eq('id', callId);

    console.log('✅ Recording saved to database');

    res.json({ success: true, message: 'Recording received' });
  } catch (error: any) {
    console.error('❌ Error processing recording webhook:', error.message);
    res.status(500).json({ error: 'Failed to process recording' });
  }
});

/**
 * Daily.co participant joined/left webhook
 * POST /webhooks/daily/participant
 */
router.post('/daily/participant', async (req: Request, res: Response) => {
  try {
    const { room_name, participant_id, event, user_name } = req.body;

    console.log(`👤 Participant ${event}:`, user_name);

    const callId = room_name.replace('paynet-call-', '');

    // Track who joined
    const updateData: any = {};

    if (user_name.includes('Seller')) {
      updateData.seller_joined = event === 'participant-joined';
    } else if (user_name.includes('Buyer')) {
      updateData.buyer_joined = event === 'participant-joined';
    } else if (user_name.includes('Target') || user_name.includes('Contact')) {
      updateData.target_joined = event === 'participant-joined';
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('intro_calls')
        .update(updateData)
        .eq('id', callId);
    }

    res.json({ success: true, message: 'Participant event received' });
  } catch (error: any) {
    console.error('❌ Error processing participant webhook:', error.message);
    res.status(500).json({ error: 'Failed to process participant event' });
  }
});

// Unified Daily webhook with idempotency & secret (additional endpoints can be routed here)
router.post('/daily/events', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-daily-signature'] as string | undefined;
    if (!process.env.DAILY_WEBHOOK_SECRET || secret !== process.env.DAILY_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body || {};
    const eventId = event?.id || event?.data?.id || `${Date.now()}-${Math.random()}`;
    // Idempotency check
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('provider', 'daily')
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing) return res.json({ success: true, duplicate: true });
    await supabase
      .from('webhook_events')
      .insert({ provider: 'daily', event_id: eventId, processed_at: new Date().toISOString() });

    const type = event?.type || '';
    if (type === 'meeting.started') {
      // no-op for now
    } else if (type === 'meeting.ended') {
      // Stop agent if active? handled elsewhere; placeholder
    } else if (type === 'recording.ready') {
      // handled by /daily/recording above; placeholder
    } else if (type === 'transcript.ready') {
      const transcriptId = event?.data?.id;
      const roomName = event?.data?.room?.name;
      const callId = roomName?.replace('paynet-call-', '');
      if (transcriptId && callId) {
        await supabase
          .from('intro_calls')
          .update({ daily_transcript_id: transcriptId })
          .eq('id', callId);
      }
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Daily unified webhook error:', error.message);
    return res.status(500).json({ error: 'Failed to process Daily event' });
  }
});

/**
 * Note: Pipecat Cloud does not support outgoing webhooks.
 * Instead, use Daily webhooks (meeting.ended, transcription.ready) to track call lifecycle.
 * If you need real-time agent status, poll the Pipecat API or rely on Daily's session data.
 */

export default router;
