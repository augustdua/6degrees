import { Router, Response } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { recalculateScore } from '../services/socialCapitalService';
import {
  getProfileVocab,
  getMyExplicitProfileFacets,
  saveMyExplicitProfileFacets,
  parseResumeToDraftFacets,
  getUserExplicitProfileFacets
} from '../controllers/profileFacetsController';

const router = Router();

async function getOrCreateFounderProject(userId: string) {
  try {
    const { data: existing, error: exErr } = await supabase
      .from('founder_projects')
      .select('id, user_id, name, tagline, description, website_url, stage, product_demo_url, pitch_url, github_repo_full_name, is_public, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) return existing;

    const { data: created, error: crErr } = await supabase
      .from('founder_projects')
      .insert({ user_id: userId, name: 'My Venture', is_public: true })
      .select('id, user_id, name, tagline, description, website_url, stage, product_demo_url, pitch_url, github_repo_full_name, is_public, created_at, updated_at')
      .single();
    if (crErr) throw crErr;
    return created;
  } catch (err: any) {
    // If migrations haven't been applied in an environment, avoid breaking profiles.
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('founder_projects') || msg.toLowerCase().includes('does not exist')) {
      return null;
    }
    throw err;
  }
}

// Multer for CV uploads (in-memory, not persisted)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type. Upload PDF or DOCX.'));
  }
});

// ============================================================================
// Explicit profile facets (vocab + user selections)
// IMPORTANT: define these before any '/:userId' routes to avoid shadowing.
// ============================================================================

// Public vocab (curated lists)
router.get('/vocab', getProfileVocab);

// Current user facets
router.get('/explicit', authenticate, getMyExplicitProfileFacets);
router.put('/explicit', authenticate, saveMyExplicitProfileFacets);

// Resume parse → draft facets (no persistence)
router.post('/resume-parse', authenticate, upload.single('resume'), parseResumeToDraftFacets);

// Public (or owner-only) view of explicit facets for a user
router.get('/:userId/explicit', optionalAuth, getUserExplicitProfileFacets);

// ============================================================================
// Founder Project (single venture) + Standup Journey
// ============================================================================

/**
 * GET /api/profile/me/project
 * Returns the authenticated user's single venture project (auto-creates if missing).
 */
router.get('/me/project', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const project = await getOrCreateFounderProject(userId);
    res.json({ project });
  } catch (error: any) {
    console.error('Error in GET /api/profile/me/project:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/profile/me/project
 * Updates the authenticated user's venture project fields.
 */
router.put('/me/project', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      name,
      tagline,
      description,
      website_url,
      stage,
      product_demo_url,
      pitch_url,
      github_repo_full_name,
      is_public
    } = req.body || {};

    const project = await getOrCreateFounderProject(userId);
    if (!project) {
      res.status(503).json({ error: 'Founder projects not available (migration pending)' });
      return;
    }

    const update: any = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof tagline === 'string') update.tagline = tagline.trim();
    if (typeof description === 'string') update.description = description.trim();
    if (typeof website_url === 'string') update.website_url = website_url.trim();
    if (typeof stage === 'string') update.stage = stage.trim();
    if (typeof product_demo_url === 'string') update.product_demo_url = product_demo_url.trim();
    if (typeof pitch_url === 'string') update.pitch_url = pitch_url.trim();
    if (typeof github_repo_full_name === 'string') update.github_repo_full_name = github_repo_full_name.trim();
    if (typeof is_public === 'boolean') update.is_public = is_public;

    // Nothing to update
    if (Object.keys(update).length === 0) {
      res.json({ project });
      return;
    }

    // Upsert by user_id (unique) to avoid edge cases where update-by-id returns 0 rows
    // (e.g., data drift or PostgREST object coercion issues).
    const { data, error } = await supabase
      .from('founder_projects')
      .upsert({ user_id: userId, ...update }, { onConflict: 'user_id' })
      .select('id, user_id, name, tagline, description, website_url, stage, product_demo_url, pitch_url, github_repo_full_name, is_public, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Extremely defensive fallback: return latest row if PostgREST returns no representation.
      const { data: refetched } = await supabase
        .from('founder_projects')
        .select('id, user_id, name, tagline, description, website_url, stage, product_demo_url, pitch_url, github_repo_full_name, is_public, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      res.json({ project: refetched || project });
      return;
    }

    res.json({ project: data });
  } catch (error: any) {
    console.error('Error in PUT /api/profile/me/project:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/project
 * Public read of a user's venture project (respects profile privacy).
 */
router.get('/:userId/project', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Respect profile privacy
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, is_profile_public')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    if (!userRow?.is_profile_public && req.user?.id !== userId) {
      res.status(403).json({ error: 'This profile is private' });
      return;
    }

    const { data: project, error } = await supabase
      .from('founder_projects')
      .select('id, user_id, name, tagline, description, website_url, stage, product_demo_url, pitch_url, github_repo_full_name, is_public, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    res.json({ project: project || null });
  } catch (error: any) {
    console.error('Error in GET /api/profile/:userId/project:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/standups?limit=20
 * Public read of completed standups (respects profile privacy).
 */
router.get('/:userId/standups', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '20'), 10) || 20));

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, is_profile_public, standup_current_streak, standup_max_streak')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    if (!userRow?.is_profile_public && req.user?.id !== userId) {
      res.status(403).json({ error: 'This profile is private' });
      return;
    }

    const { data: standups, error } = await supabase
      .from('daily_standups')
      .select('id, project_id, local_date, timezone, yesterday, today, blockers, created_at')
      .eq('user_id', userId)
      .order('local_date', { ascending: false })
      .limit(limit);
    if (error) throw error;

    res.json({
      standups: standups || [],
      streak: userRow?.standup_current_streak || 0,
      maxStreak: userRow?.standup_max_streak || 0
    });
  } catch (error: any) {
    console.error('Error in GET /api/profile/:userId/standups:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/github-commit-counts?days=14
 * Returns daily commit counts for the founder's configured GitHub repo.
 * Aggregate counts only (no messages/diffs). Public-friendly.
 */
router.get('/:userId/github-commit-counts', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const days = Math.max(1, Math.min(30, parseInt(String(req.query.days || '14'), 10) || 14));
    const force = String((req.query as any)?.force || '') === '1';

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, is_profile_public')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    if (!userRow?.is_profile_public && req.user?.id !== userId) {
      res.status(403).json({ error: 'This profile is private' });
      return;
    }

    const { data: project, error: projErr } = await supabase
      .from('founder_projects')
      .select('id, github_repo_full_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (projErr) throw projErr;

    const repoFullName = String((project as any)?.github_repo_full_name || '').trim();
    if (!project?.id || !repoFullName) {
      res.json({ repo: null, days, counts: [] });
      return;
    }

    // If we have cached counts updated recently, prefer them.
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - (days - 1));
    const sinceISO = sinceDate.toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: cached, error: cacheErr } = await supabase
      .from('founder_github_daily_commits')
      .select('local_date, commit_count, updated_at')
      .eq('project_id', project.id)
      .gte('local_date', sinceISO)
      .order('local_date', { ascending: true });
    if (cacheErr) throw cacheErr;

    // If cache covers all days and was updated in last 6 hours, return it.
    const now = Date.now();
    const newestUpdatedAt = (cached || []).reduce((acc: number, row: any) => {
      const t = new Date(row.updated_at).getTime();
      return Number.isNaN(t) ? acc : Math.max(acc, t);
    }, 0);
    const coversAllDays = (cached || []).length >= days;
    const freshEnough = newestUpdatedAt && now - newestUpdatedAt < 6 * 60 * 60 * 1000;
    const isOwner = req.user?.id === userId;
    const allowForce = isOwner && force;
    // Throttle force refresh to avoid GitHub rate limits (allow once every 2 minutes)
    const forceAllowedByThrottle = !newestUpdatedAt || now - newestUpdatedAt > 2 * 60 * 1000;

    if (coversAllDays && freshEnough && (!allowForce || !forceAllowedByThrottle)) {
      res.json({
        repo: repoFullName,
        days,
        counts: (cached || []).map((r: any) => ({ date: r.local_date, count: r.commit_count })),
        updatedAt: newestUpdatedAt ? new Date(newestUpdatedAt).toISOString() : null,
        cached: true,
        throttled: allowForce && !forceAllowedByThrottle
      });
      return;
    }

    // Fetch from GitHub. Prefer GitHub App installation token (supports private repos),
    // fall back to env token if configured.
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      res.status(400).json({ error: 'Invalid github_repo_full_name. Use owner/repo.' });
      return;
    }

    // Determine auth header for GitHub calls
    let ghAuthHeader: string | null = null;
    try {
      const { data: userAuthRow } = await supabase
        .from('users')
        .select('github_installation_id')
        .eq('id', userId)
        .single();
      const installationId = Number((userAuthRow as any)?.github_installation_id);
      if (installationId && !Number.isNaN(installationId)) {
        const appId = process.env.GITHUB_APP_ID;
        const pkRaw = process.env.GITHUB_APP_PRIVATE_KEY;
        if (appId && pkRaw) {
          const pk = pkRaw.includes('-----BEGIN') ? pkRaw.replace(/\\n/g, '\n') : pkRaw;
          const nowSec = Math.floor(Date.now() / 1000);
          const appJwt = jwt.sign(
            { iat: nowSec - 5, exp: nowSec + 9 * 60, iss: String(appId) },
            pk,
            { algorithm: 'RS256' }
          );
          const tokRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `Bearer ${appJwt}`,
              'User-Agent': 'zaurq/1.0'
            }
          });
          const tokText = await tokRes.text();
          if (tokRes.ok) {
            const tokJson = JSON.parse(tokText);
            const instTok = String(tokJson?.token || '');
            if (instTok) ghAuthHeader = `Bearer ${instTok}`;
          }
        }
      }
    } catch {
      // best-effort
    }
    if (!ghAuthHeader && process.env.GITHUB_TOKEN) {
      ghAuthHeader = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const countsByDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(sinceDate);
      d.setDate(sinceDate.getDate() + i);
      countsByDate.set(d.toISOString().slice(0, 10), 0);
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'zaurq/1.0'
    };
    if (ghAuthHeader) {
      headers['Authorization'] = ghAuthHeader;
    }

    // Pull commits since earliest day; group by commit author date.
    const since = new Date(sinceISO + 'T00:00:00.000Z').toISOString();
    const until = new Date().toISOString();

    let page = 1;
    while (page <= 10) { // cap pages to avoid runaway (per_page=100 => max 1000 commits window)
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&per_page=100&page=${page}`;
      const ghRes = await fetch(url, { headers });
      if (!ghRes.ok) {
        const text = await ghRes.text().catch(() => '');
        res.status(502).json({ error: `GitHub fetch failed (${ghRes.status})`, details: text || undefined });
        return;
      }
      const commits = (await ghRes.json()) as any[];
      if (!Array.isArray(commits) || commits.length === 0) break;

      for (const c of commits) {
        const dateStr = c?.commit?.author?.date || c?.commit?.committer?.date;
        if (!dateStr) continue;
        const day = new Date(dateStr).toISOString().slice(0, 10);
        if (countsByDate.has(day)) countsByDate.set(day, (countsByDate.get(day) || 0) + 1);
      }

      if (commits.length < 100) break;
      page += 1;
    }

    // Upsert cache
    const upserts = Array.from(countsByDate.entries()).map(([date, count]) => ({
      project_id: project.id,
      local_date: date,
      commit_count: count,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('founder_github_daily_commits').upsert(upserts, { onConflict: 'project_id,local_date' });

    // Do not leak repo name publicly; only the owner can see it.
    const canSeeRepo = req.user?.id === userId;
    res.json({
      repo: canSeeRepo ? repoFullName : null,
      days,
      counts: upserts.map((u) => ({ date: u.local_date, count: u.commit_count })),
      updatedAt: new Date().toISOString(),
      cached: false
    });
  } catch (error: any) {
    console.error('Error in GET /api/profile/:userId/github-commit-counts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/profile/me/featured-connections
 * Get current user's featured connections
 */
router.get('/me/featured-connections', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('user_featured_connections')
      .select(`
        id,
        user_id,
        featured_user_id,
        featured_email,
        display_order,
        user:users!user_featured_connections_featured_user_id_fkey(
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('user_id', userId)
      .order('display_order');

    if (error) {
      console.error('Error fetching featured connections:', error);
      res.status(500).json({ error: 'Failed to fetch featured connections' });
      return;
    }

    res.json({ featured_connections: data || [] });
  } catch (error) {
    console.error('Error in GET /api/profile/me/featured-connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/me/featured-connections
 * Add a featured connection
 */
router.post('/me/featured-connections', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { featured_user_id, featured_email, display_order } = req.body;

    // Validate that either featured_user_id or featured_email is provided
    if (!featured_user_id && !featured_email) {
      res.status(400).json({ error: 'Either featured_user_id or featured_email is required' });
      return;
    }

    if (featured_user_id && featured_email) {
      res.status(400).json({ error: 'Provide either featured_user_id or featured_email, not both' });
      return;
    }

    // Check if user has reached the limit
    const { count, error: countError } = await supabase
      .from('user_featured_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting featured connections:', countError);
      res.status(500).json({ error: 'Failed to add featured connection' });
      return;
    }

    if ((count || 0) >= 8) {
      res.status(400).json({ error: 'Maximum of 8 featured connections allowed' });
      return;
    }

    const { data, error } = await supabase
      .from('user_featured_connections')
      .insert({
        user_id: userId,
        featured_user_id: featured_user_id || null,
        featured_email: featured_email || null,
        display_order: display_order || count || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding featured connection:', error);
      res.status(500).json({ error: 'Failed to add featured connection' });
      return;
    }

    // Trigger social capital score recalculation
    recalculateScore(userId).catch(err => 
      console.error('Error recalculating social capital score:', err)
    );

    res.json({ featured_connection: data });
  } catch (error) {
    console.error('Error in POST /api/profile/me/featured-connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/profile/me/featured-connections/:id
 * Remove a featured connection
 */
router.delete('/me/featured-connections/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('user_featured_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing featured connection:', error);
      res.status(500).json({ error: 'Failed to remove featured connection' });
      return;
    }

    // Trigger social capital score recalculation
    recalculateScore(userId).catch(err => 
      console.error('Error recalculating social capital score:', err)
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/profile/me/featured-connections/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/profile/me/featured-connections/order
 * Update display order of featured connections
 */
router.put('/me/featured-connections/order', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { orders } = req.body; // Array of { id, display_order }

    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders must be an array' });
      return;
    }

    // Update each connection's display order
    const updates = orders.map(({ id, display_order }) =>
      supabase
        .from('user_featured_connections')
        .update({ display_order })
        .eq('id', id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/profile/me/featured-connections/order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Public profile routes (keep at end to avoid shadowing)
// ============================================================================

/**
 * GET /api/profile/:userId
 * Get public profile data for a user
 */
router.get('/:userId', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;

    // Call the database function to get profile data
    const { data, error } = await supabase.rpc('get_public_profile', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Check if profile is private
    if (!data.user.is_profile_public) {
      // Only return data if requester is the profile owner
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user && user.id === userId) {
          res.json(data);
          return;
        }
      }

      res.status(403).json({ error: 'This profile is private' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error in GET /api/profile/:userId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/offers
 * Get active offers for a user
 */
router.get('/:userId/offers', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const { data, error } = await supabase
      .from('offers')
      .select('id, title, description, reward, currency, created_at')
      .eq('offer_creator_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching offers:', error);
      res.status(500).json({ error: 'Failed to fetch offers' });
      return;
    }

    res.json({ offers: data || [] });
  } catch (error) {
    console.error('Error in GET /api/profile/:userId/offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/requests
 * Get active connection requests for a user
 */
router.get('/:userId/requests', async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, reward, currency, created_at')
      .eq('creator_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
      return;
    }

    res.json({ requests: data || [] });
  } catch (error) {
    console.error('Error in GET /api/profile/:userId/requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

