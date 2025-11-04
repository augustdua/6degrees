import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { createDailyRoom, generateMeetingToken } from '../services/dailyService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Get all intro calls for the authenticated user (as buyer, creator, or target)
export const getMyIntros = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data, error } = await supabase
      .from('intro_calls')
      .select(`
        *,
        offer:offers(id, title, description, asking_price_inr),
        buyer:users!buyer_id(id, first_name, last_name, profile_picture_url),
        creator:users!creator_id(id, first_name, last_name, profile_picture_url),
        target:users!target_id(id, first_name, last_name, profile_picture_url)
      `)
      .or(`buyer_id.eq.${userId},creator_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching intros:', error);
      res.status(500).json({ error: 'Failed to fetch intro calls' });
      return;
    }

    // Add role information for each intro
    const introsWithRole = data?.map(intro => ({
      ...intro,
      user_role: 
        intro.buyer_id === userId ? 'buyer' :
        intro.creator_id === userId ? 'creator' :
        'target'
    }));

    res.json(introsWithRole || []);
  } catch (error) {
    console.error('Error in getMyIntros:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start an intro call (create Daily room, update status)
export const startIntroCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { context, questions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get intro details
    const { data: intro, error: introError } = await supabase
      .from('intro_calls')
      .select(`
        *,
        offer:offers(title),
        buyer:users!buyer_id(id, first_name, last_name),
        creator:users!creator_id(id, first_name, last_name),
        target:users!target_id(id, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (introError || !intro) {
      res.status(404).json({ error: 'Intro call not found' });
      return;
    }

    // Verify user is part of this intro
    if (intro.buyer_id !== userId && intro.creator_id !== userId && intro.target_id !== userId) {
      res.status(403).json({ error: 'Not authorized to start this call' });
      return;
    }

    // Create Daily room if not exists
    let roomUrl = intro.daily_room_url;
    let roomName = intro.daily_room_name;

    if (!roomUrl) {
      try {
        const room = await createDailyRoom(`intro-${id}`, 7200); // 2 hour expiry
        roomUrl = room.url;
        roomName = room.name;
      } catch (error) {
        console.error('Error creating Daily room:', error);
        res.status(500).json({ error: 'Failed to create video room' });
        return;
      }
    }

    // Update intro with room details and context/questions
    const updateData: any = {
      daily_room_url: roomUrl,
      daily_room_name: roomName,
      status: 'in_progress',
      started_at: new Date().toISOString()
    };

    // Only update context/questions if provided (usually by buyer)
    if (context) updateData.buyer_context = context;
    if (questions) updateData.buyer_questions = questions;

    const { error: updateError } = await supabase
      .from('intro_calls')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating intro call:', updateError);
      res.status(500).json({ error: 'Failed to update intro call' });
      return;
    }

    // Send notifications to other parties
    const parties = [
      { id: intro.buyer_id, name: `${(intro.buyer as any).first_name} ${(intro.buyer as any).last_name}` },
      { id: intro.creator_id, name: `${(intro.creator as any).first_name} ${(intro.creator as any).last_name}` },
      { id: intro.target_id, name: `${(intro.target as any).first_name} ${(intro.target as any).last_name}` }
    ].filter(party => party.id !== userId);

    for (const party of parties) {
      await supabase.from('notifications').insert({
        user_id: party.id,
        type: 'intro_scheduled',
        title: 'Intro Call Started',
        message: `An intro call for "${(intro.offer as any).title}" has been started. Join now!`,
        data: {
          intro_id: id,
          room_url: roomUrl
        }
      });
    }

    res.json({
      success: true,
      room_url: roomUrl,
      room_name: roomName,
      intro_id: id
    });
  } catch (error) {
    console.error('Error in startIntroCall:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get intro call join details (for joining an already started call)
export const getIntroJoinDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get intro details
    const { data: intro, error: introError } = await supabase
      .from('intro_calls')
      .select('*')
      .eq('id', id)
      .single();

    if (introError || !intro) {
      res.status(404).json({ error: 'Intro call not found' });
      return;
    }

    // Verify user is part of this intro
    if (intro.buyer_id !== userId && intro.creator_id !== userId && intro.target_id !== userId) {
      res.status(403).json({ error: 'Not authorized to join this call' });
      return;
    }

    if (!intro.daily_room_url) {
      res.status(400).json({ error: 'Call has not been started yet' });
      return;
    }

    res.json({
      room_url: intro.daily_room_url,
      room_name: intro.daily_room_name,
      buyer_context: intro.buyer_context,
      buyer_questions: intro.buyer_questions,
      status: intro.status
    });
  } catch (error) {
    console.error('Error in getIntroJoinDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Complete an intro call (mark as completed, store AI quality check)
export const completeIntroCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { callQualityCheck } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get intro to verify user is part of it
    const { data: intro, error: introError } = await supabase
      .from('intro_calls')
      .select('buyer_id, creator_id, target_id')
      .eq('id', id)
      .single();

    if (introError || !intro) {
      res.status(404).json({ error: 'Intro call not found' });
      return;
    }

    // Verify user is part of this intro
    if (intro.buyer_id !== userId && intro.creator_id !== userId && intro.target_id !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Update intro status
    const { error: updateError } = await supabase
      .from('intro_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        call_quality_check: callQualityCheck || null
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error completing intro call:', updateError);
      res.status(500).json({ error: 'Failed to complete intro call' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in completeIntroCall:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

