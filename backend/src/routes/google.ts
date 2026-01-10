import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import {
  disconnectGoogle,
  getGoogleAuthUrl,
  getGoogleStatus,
  handleGoogleOAuthCallback,
} from '../services/googleService';
import { createGoogleEvent, listGoogleCalendars, listGoogleEvents } from '../services/googleCalendarService';

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
    const returnTo = typeof req.query?.returnTo === 'string' ? String(req.query.returnTo) : undefined;
    const url = getGoogleAuthUrl(userId, redirectUri, { returnTo });
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
    const { returnTo } = await handleGoogleOAuthCallback({ code, state, redirectUri });

    // Redirect back to the intended frontend page (default "/").
    const targetPath = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/';
    const target = new URL(frontend);
    target.pathname = targetPath;
    target.searchParams.set('google', 'connected');
    return res.redirect(target.toString());
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

/**
 * GET /api/google/calendars
 */
router.get('/calendars', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const redirectUri = computeRedirectUri(req);
    const calendars = await listGoogleCalendars(userId, redirectUri);
    res.json({ ok: true, calendars });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/google/calendars/:calendarId/events
 * Query: timeMin, timeMax, maxResults
 */
router.get('/calendars/:calendarId/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const calendarId = String(req.params.calendarId || 'primary');
    const redirectUri = computeRedirectUri(req);
    const timeMin = typeof req.query?.timeMin === 'string' ? String(req.query.timeMin) : undefined;
    const timeMax = typeof req.query?.timeMax === 'string' ? String(req.query.timeMax) : undefined;
    const maxResultsRaw = typeof req.query?.maxResults === 'string' ? Number(req.query.maxResults) : undefined;
    const maxResults = Number.isFinite(maxResultsRaw as any) ? (maxResultsRaw as number) : undefined;

    const events = await listGoogleEvents({ userId, redirectUri, calendarId, timeMin, timeMax, maxResults });
    res.json({ ok: true, events });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/google/calendars/:calendarId/events
 * Body: { summary, description?, location?, start: { dateTime, timeZone? }, end: { dateTime, timeZone? }, attendees? }
 */
router.post('/calendars/:calendarId/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const calendarId = String(req.params.calendarId || 'primary');
    const redirectUri = computeRedirectUri(req);
    const body = req.body || {};

    const summary = String(body?.summary || '').trim();
    const startDateTime = String(body?.start?.dateTime || '').trim();
    const endDateTime = String(body?.end?.dateTime || '').trim();
    if (!summary) {
      res.status(400).json({ ok: false, error: 'Missing summary' });
      return;
    }
    if (!startDateTime || !endDateTime) {
      res.status(400).json({ ok: false, error: 'Missing start/end dateTime' });
      return;
    }

    const created = await createGoogleEvent({
      userId,
      redirectUri,
      calendarId,
      event: {
        summary,
        description: typeof body?.description === 'string' ? body.description : undefined,
        location: typeof body?.location === 'string' ? body.location : undefined,
        start: {
          dateTime: startDateTime,
          timeZone: typeof body?.start?.timeZone === 'string' ? body.start.timeZone : undefined,
        },
        end: {
          dateTime: endDateTime,
          timeZone: typeof body?.end?.timeZone === 'string' ? body.end.timeZone : undefined,
        },
        attendees: Array.isArray(body?.attendees)
          ? body.attendees
              .map((a: any) => ({ email: typeof a?.email === 'string' ? String(a.email).trim() : '' }))
              .filter((a: any) => a.email)
          : undefined,
      },
    });

    res.json({ ok: true, event: created });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;



