import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

function extractLinkedInHandle(input?: string | null): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    const parts = u.pathname.split('/').filter(Boolean);
    const inIdx = parts.findIndex((p) => p.toLowerCase() === 'in');
    if (inIdx >= 0 && parts[inIdx + 1]) return parts[inIdx + 1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Private lookup: resolve "my" seed profile slug.
 * Tries: claimed_user_id, email, then LinkedIn handle match.
 * GET /api/seed-profiles/my
 */
router.get('/my', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1) Exact claimed_user_id match
    const claimed = await supabase
      .from('seed_profiles')
      .select('slug, status')
      .eq('claimed_user_id', userId)
      .in('status', ['unclaimed', 'claimed'])
      .maybeSingle();
    if (claimed.error) {
      console.error('seed_profiles my claimed fetch error:', claimed.error);
      res.status(500).json({ error: 'Failed to resolve seed profile' });
      return;
    }
    if (claimed.data?.slug) {
      res.json({ slug: claimed.data.slug, status: claimed.data.status, match: 'claimed_user_id' });
      return;
    }

    // 2) Email match (if the seed list includes it)
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (email) {
      const byEmail = await supabase
        .from('seed_profiles')
        .select('slug, status')
        .eq('email', email)
        .in('status', ['unclaimed', 'claimed'])
        .maybeSingle();
      if (byEmail.error) {
        console.error('seed_profiles my email fetch error:', byEmail.error);
        res.status(500).json({ error: 'Failed to resolve seed profile' });
        return;
      }
      if (byEmail.data?.slug) {
        res.json({ slug: byEmail.data.slug, status: byEmail.data.status, match: 'email' });
        return;
      }
    }

    // 3) LinkedIn handle match
    const handle = extractLinkedInHandle(req.user?.linkedinUrl || null);
    if (handle) {
      const byHandle = await supabase
        .from('seed_profiles')
        .select('slug, status')
        .ilike('linkedin_url', `%/in/${handle}%`)
        .in('status', ['unclaimed', 'claimed'])
        .maybeSingle();
      if (byHandle.error) {
        console.error('seed_profiles my linkedin handle fetch error:', byHandle.error);
        res.status(500).json({ error: 'Failed to resolve seed profile' });
        return;
      }
      if (byHandle.data?.slug) {
        res.json({ slug: byHandle.data.slug, status: byHandle.data.status, match: 'linkedin_handle' });
        return;
      }
    }

    res.status(404).json({ error: 'No seed profile found for user' });
  } catch (e: any) {
    console.error('GET /api/seed-profiles/my error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

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


