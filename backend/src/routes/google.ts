import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import {
  disconnectGoogle,
  getGoogleAuthUrl,
  getGoogleStatus,
  handleGoogleOAuthCallback,
} from '../services/googleService';

const router = Router();

function computeRedirectUri(req: AuthenticatedRequest) {
  // Prefer explicit env var for Google console configuration.
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}/api/google/callback`;
}

/**
 * GET /api/google/status
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = await getGoogleStatus(userId);
    res.json({ ok: true, ...status });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/google/connect
 * Returns Google OAuth URL (client then redirects browser).
 */
router.get('/connect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const redirectUri = computeRedirectUri(req);
    const url = getGoogleAuthUrl(userId, redirectUri);
    res.json({ ok: true, url });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/google/callback
 * Google redirects here with code + state.
 * We store tokens in users.metadata.google and redirect back to frontend.
 */
router.get('/callback', async (req: any, res: Response) => {
  const frontend =
    process.env.ZAURQ_FRONTEND_URL ||
    process.env.PRODUCTION_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';

  try {
    const code = String(req.query?.code || '');
    const state = String(req.query?.state || '');
    if (!code || !state) {
      return res.redirect(`${frontend}/?google=error&reason=missing_code_or_state`);
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/google/callback`;
    await handleGoogleOAuthCallback({ code, state, redirectUri });
    return res.redirect(`${frontend}/?google=connected`);
  } catch (e: any) {
    const reason = encodeURIComponent(e?.message || 'unknown');
    return res.redirect(`${frontend}/?google=error&reason=${reason}`);
  }
});

/**
 * POST /api/google/disconnect
 */
router.post('/disconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const r = await disconnectGoogle(userId);
    res.json(r);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;


