import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

type TargetType = 'forum_post' | 'forum_comment' | 'offer' | 'offer_generation';
type EventType =
  | 'view'
  | 'scroll_50'
  | 'scroll_90'
  | 'time_spent'
  | 'reaction'
  | 'comment'
  | 'share'
  | 'click'
  | 'book_click'
  | 'bid_click'
  | 'prompt_submit';

interface IncomingInteraction {
  target_type: TargetType;
  target_id: string;
  event_type: EventType;
  duration_ms?: number;
  position?: number;
  metadata?: Record<string, any>;
}

export const trackInteractionBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { interactions, session_id } = req.body as {
      interactions?: IncomingInteraction[];
      session_id?: string;
    };

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    if (!Array.isArray(interactions) || interactions.length === 0) {
      res.status(400).json({ error: 'interactions array is required' });
      return;
    }

    // Limit to 100 interactions per batch
    const batch = interactions.slice(0, 100).map((i) => ({
      user_id: userId,
      session_id,
      target_type: i.target_type,
      target_id: i.target_id,
      event_type: i.event_type,
      duration_ms: typeof i.duration_ms === 'number' ? i.duration_ms : null,
      position: typeof i.position === 'number' ? i.position : null,
      metadata: i.metadata || {},
    }));

    const { error } = await supabase.from('interactions').insert(batch);

    if (error) {
      console.error('Error tracking interactions:', error);
      // Don't fail the request - tracking is fire-and-forget
    }

    res.json({ tracked: batch.length });
  } catch (error: any) {
    console.error('Error in trackInteractionBatch:', error);
    // Still return success - tracking shouldn't block UX
    res.json({ tracked: 0 });
  }
};


