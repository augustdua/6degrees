import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requirePartner } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/zaurq/club
 * Partners-only: returns the current user's curated club (<10 members).
 */
router.get('/club', authenticate, requirePartner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('zaurq_club_members')
      .select(
        `
        id,
        created_at,
        member:users!zaurq_club_members_member_user_id_fkey(
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          linkedin_url,
          twitter_url
        )
      `
      )
      .eq('partner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const members = (data || [])
      .map((row: any) => row.member)
      .filter(Boolean)
      .slice(0, 10);

    res.json({ members });
  } catch (error: any) {
    console.error('Error in GET /api/zaurq/club:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;


