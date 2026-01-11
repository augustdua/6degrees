import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import {
  disconnectWhatsApp,
  ensureWhatsAppSession,
  enrichWhatsAppContacts,
  getQrStatus,
  getWhatsAppStatus,
  sendWhatsAppInvites,
  syncWhatsAppContacts,
} from '../services/whatsappService';

const router = Router();

// Conservative rate limit for sending invites.
const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Conservative rate limit for enrichment calls (profile photos / status can be expensive).
const enrichLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/whatsapp/connect
 * Starts (or reuses) the user's WhatsApp session.
 */
router.post('/connect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = await ensureWhatsAppSession(userId);
    // If we have auth already, briefly wait for the socket to open before responding.
    // This avoids the UX where the phone is linked but the server is still "connecting".
    const hasAuth = Boolean((session as any)?.sock?.authState?.creds);
    if (hasAuth && session.status === 'connecting') {
      // Best-effort wait; do not block too long.
      await new Promise((r) => setTimeout(r, 250));
    }
    res.json({ ok: true, status: session.status, connected: session.status === 'connected' });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/whatsapp/status
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = await getWhatsAppStatus(userId);
    res.json({ ok: true, ...status });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/whatsapp/qr
 * Returns the latest QR string (poll from the client).
 */
router.get('/qr', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await getQrStatus(userId);
    res.json({ ok: true, ...data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/whatsapp/sync-contacts
 */
router.post('/sync-contacts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const googleAccessToken =
      typeof (req.body as any)?.googleAccessToken === 'string' ? String((req.body as any).googleAccessToken) : undefined;
    const result = await syncWhatsAppContacts(userId, { googleAccessToken });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/whatsapp/contact-details
 * body: { jids?: string[], phones?: string[], includePhoto?: boolean, includeAbout?: boolean, includeBusiness?: boolean, limit?: number }
 */
router.post('/contact-details', authenticate, enrichLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const body = req.body || {};
    const result = await enrichWhatsAppContacts(userId, {
      jids: Array.isArray(body?.jids) ? body.jids : [],
      phones: Array.isArray(body?.phones) ? body.phones : [],
      includePhoto: body?.includePhoto !== false,
      includeAbout: body?.includeAbout !== false,
      includeBusiness: body?.includeBusiness !== false,
      limit: typeof body?.limit === 'number' ? body.limit : undefined,
    });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/whatsapp/send-invites
 * body: { phones: string[], message: string }
 */
router.post('/send-invites', authenticate, inviteLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const phones = Array.isArray(req.body?.phones) ? req.body.phones : [];
    const message = String(req.body?.message || '');
    const result = await sendWhatsAppInvites(userId, phones, message);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * POST /api/whatsapp/disconnect
 */
router.post('/disconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await disconnectWhatsApp(userId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;


