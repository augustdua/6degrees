import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

function getGitHubAppId(): string {
  const v = process.env.GITHUB_APP_ID;
  if (!v) throw new Error('Missing GITHUB_APP_ID');
  return String(v);
}

function getGitHubAppSlug(): string {
  const v = process.env.GITHUB_APP_SLUG;
  if (!v) throw new Error('Missing GITHUB_APP_SLUG');
  return String(v);
}

function getGitHubAppPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) throw new Error('Missing GITHUB_APP_PRIVATE_KEY');
  // Support either literal PEM (with newlines) or env-escaped \n.
  return raw.includes('-----BEGIN') ? raw.replace(/\\n/g, '\n') : raw;
}

function createAppJwt(): string {
  const appId = getGitHubAppId();
  const privateKey = getGitHubAppPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  // GitHub recommends max 10 minutes.
  return jwt.sign(
    { iat: now - 5, exp: now + 9 * 60, iss: appId },
    privateKey,
    { algorithm: 'RS256' }
  );
}

async function createInstallationToken(installationId: number): Promise<string> {
  const token = createAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'zaurq/1.0'
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub installation token failed (${res.status}): ${text}`);
  const json = JSON.parse(text);
  const accessToken = String(json?.token || '');
  if (!accessToken) throw new Error('GitHub installation token missing token');
  return accessToken;
}

/**
 * GET /api/github/connect
 * Redirects user to GitHub App install screen.
 *
 * NOTE: Configure your GitHub App "Setup URL" to:
 *   https://<backend>/api/github/callback
 */
router.get('/connect', async (_req, res: Response): Promise<void> => {
  try {
    const slug = getGitHubAppSlug();
    const url = `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`;
    res.redirect(url);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to start GitHub connect' });
  }
});

/**
 * GET /api/github/callback?installation_id=...&setup_action=install
 * Receives GitHub App installation callback and redirects to frontend.
 *
 * Configure GitHub App "Setup URL" to this endpoint.
 */
router.get('/callback', async (req, res: Response): Promise<void> => {
  try {
    const installationId = String(req.query.installation_id || '').trim();
    if (!installationId) {
      res.status(400).send('Missing installation_id');
      return;
    }

    const frontend =
      process.env.ZAURQ_FRONTEND_URL ||
      process.env.PRODUCTION_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      'https://zaurq.com';

    res.redirect(`${frontend.replace(/\/$/, '')}/github/callback?installation_id=${encodeURIComponent(installationId)}`);
  } catch (e: any) {
    res.status(500).send(e?.message || 'GitHub callback failed');
  }
});

/**
 * POST /api/github/attach
 * Body: { installationId: number }
 * Attaches the installation_id to the authenticated user.
 */
router.post('/attach', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const installationIdNum = Number(req.body?.installationId);
    if (!installationIdNum || Number.isNaN(installationIdNum)) {
      res.status(400).json({ error: 'installationId is required' });
      return;
    }

    // Optional validation: ensure installation token can be generated.
    await createInstallationToken(installationIdNum);

    const { error } = await supabase
      .from('users')
      .update({
        github_installation_id: installationIdNum,
        github_connected_at: new Date().toISOString()
      })
      .eq('id', userId);
    if (error) throw error;

    res.json({ ok: true, installationId: installationIdNum });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to attach GitHub installation' });
  }
});

/**
 * GET /api/github/repos
 * Lists repos visible to the user's installation.
 */
router.get('/repos', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('github_installation_id')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    const installationId = Number((userRow as any)?.github_installation_id);
    if (!installationId || Number.isNaN(installationId)) {
      res.json({ connected: false, repos: [] });
      return;
    }

    const instToken = await createInstallationToken(installationId);

    const repos: Array<{ id: number; full_name: string; private: boolean }> = [];
    let page = 1;
    while (page <= 10) {
      const url = `https://api.github.com/installation/repositories?per_page=100&page=${page}`;
      const ghRes = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${instToken}`,
          'User-Agent': 'zaurq/1.0'
        }
      });
      const text = await ghRes.text();
      if (!ghRes.ok) throw new Error(`GitHub repos fetch failed (${ghRes.status}): ${text}`);
      const json = JSON.parse(text);
      const arr = Array.isArray(json?.repositories) ? json.repositories : [];
      for (const r of arr) {
        if (r?.full_name) repos.push({ id: r.id, full_name: r.full_name, private: Boolean(r.private) });
      }
      if (arr.length < 100) break;
      page += 1;
    }

    res.json({ connected: true, repos });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to list repos' });
  }
});

export default router;


