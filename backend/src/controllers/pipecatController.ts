import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const startCallAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch call and verify participant
    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*, bid:listing_bids(*), contact:listing_contacts!intro_calls_target_contact_id_fkey(*)')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    // Need a Daily room and a bot token
    const roomName = call.daily_room_name || `paynet-call-${callId}`;
    const roomUrl = call.daily_room_url || `https://6degrees.daily.co/${roomName}`;
    const { generateMeetingToken } = await import('../services/dailyService');
    const { startAgent } = await import('../services/pipecatService');
    const botToken = await generateMeetingToken(roomName, 'AI Agent', true, 7200);

    // Build context from DB
    const context: any = {
      buyerId: call.buyer_id,
      sellerId: call.seller_id,
      listingId: call.listing_id,
      bidId: call.bid_id,
      selectedContact: call.contact ? {
        full_name: call.contact.full_name,
        role_title: call.contact.role_title,
        company: call.contact.company
      } : undefined
    };

    const result = await startAgent({
      callId,
      roomName,
      roomUrl,
      token: botToken,
      prompt: call.ai_agent_prompt,
      context,
      config: call.ai_agent_config
    });

    await supabase
      .from('intro_calls')
      .update({ ai_agent_status: 'active', ai_agent_session_id: result.sessionId })
      .eq('id', callId);

    return res.json({ message: 'Agent started', sessionId: result.sessionId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to start agent' });
  }
};

export const stopCallAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { callId } = req.params as { callId: string };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: call, error } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', callId)
      .single();
    if (error || !call) return res.status(404).json({ error: 'Call not found' });
    if (call.seller_id !== userId && call.buyer_id !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (!call.ai_agent_session_id) return res.status(400).json({ error: 'No agent session' });

    const { stopAgent } = await import('../services/pipecatService');
    await stopAgent(call.ai_agent_session_id);
    await supabase
      .from('intro_calls')
      .update({ ai_agent_status: 'stopped' })
      .eq('id', callId);
    return res.json({ message: 'Agent stopped' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to stop agent' });
  }
};


