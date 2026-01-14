import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

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


