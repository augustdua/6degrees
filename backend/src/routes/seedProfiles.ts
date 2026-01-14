import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Public lookup: find seed profile slug by claimed user id.
 * GET /api/seed-profiles/by-user/:userId
 */
router.get('/by-user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId || '').trim();
    // Basic UUID check (avoid abusing service role).
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }

    const { data, error } = await supabase
      .from('seed_profiles')
      .select('id, slug, status')
      .eq('claimed_user_id', userId)
      .in('status', ['unclaimed', 'claimed'])
      .maybeSingle();

    if (error) {
      console.error('seed_profiles by-user fetch error:', error);
      res.status(500).json({ error: 'Failed to load seed profile' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'No seed profile for user' });
      return;
    }

    res.json({ slug: data.slug, status: data.status });
  } catch (e: any) {
    console.error('GET /api/seed-profiles/by-user/:userId error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

/**
 * Public seed profile (unclaimed) by slug.
 * GET /api/seed-profiles/:slug
 */
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug || slug.length > 128) {
      res.status(400).json({ error: 'Invalid slug' });
      return;
    }

    // IMPORTANT: backend uses service role, so explicitly filter out disabled.
    const { data: seed, error: seedErr } = await supabase
      .from('seed_profiles')
      .select(
        'id, slug, first_name, last_name, display_name, headline, bio, location, linkedin_url, profile_picture_url, enrichment, status, created_at, updated_at'
      )
      .eq('slug', slug)
      .in('status', ['unclaimed', 'claimed'])
      .maybeSingle();

    if (seedErr) {
      console.error('seed_profiles fetch error:', seedErr);
      res.status(500).json({ error: 'Failed to load seed profile' });
      return;
    }

    if (!seed) {
      res.status(404).json({ error: 'Seed profile not found' });
      return;
    }

    const { data: orgRows, error: orgErr } = await supabase
      .from('seed_profile_organizations')
      .select(
        `
        id,
        position,
        start_date,
        end_date,
        is_current,
        logo_url,
        organizations:organization_id (
          id,
          name,
          logo_url,
          website,
          domain,
          industry
        )
      `
      )
      .eq('seed_profile_id', seed.id)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false, nullsFirst: false });

    if (orgErr) {
      console.error('seed_profile_organizations fetch error:', orgErr);
      res.status(500).json({ error: 'Failed to load seed profile organizations' });
      return;
    }

    res.json({
      seed_profile: seed,
      organizations: orgRows || [],
    });
  } catch (e: any) {
    console.error('GET /api/seed-profiles/:slug error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

export default router;


