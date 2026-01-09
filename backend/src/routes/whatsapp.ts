import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import {
  disconnectWhatsApp,
  ensureWhatsAppSession,
  getLatestQr,
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

/**
 * POST /api/whatsapp/connect
 * Starts (or reuses) the user's WhatsApp session.
 */
router.post('/connect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = await ensureWhatsAppSession(userId);
    res.json({ ok: true, status: session.status });
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
    const qr = await getLatestQr(userId);
    res.json({ ok: true, qr });
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
    const result = await syncWhatsAppContacts(userId);
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


