import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateTelegramLinkToken,
  linkTelegramAccount,
  unlinkTelegramAccount,
  getTelegramStatus,
  toggleTelegramNotifications,
  sendTestNotification
} from '../controllers/telegramController';
import {
  authenticateFromTelegram,
  verifyAuthToken
} from '../controllers/telegramAuthController';

const router = express.Router();

// Mini App auth routes (no authentication required - they establish auth)
router.post('/webapp/auth', authenticateFromTelegram);
router.get('/webapp/verify', verifyAuthToken);

// All other routes require authentication
router.use(authenticate);

// Get Telegram connection status
router.get('/status', getTelegramStatus);

// Generate link token for one-click linking
router.post('/generate-link-token', generateTelegramLinkToken);

// Link Telegram account with token from bot
router.post('/link', linkTelegramAccount);

// Unlink Telegram account
router.post('/unlink', unlinkTelegramAccount);

// Toggle Telegram notifications on/off
router.post('/toggle-notifications', toggleTelegramNotifications);

// Send test notification (for testing integration)
router.post('/test-notification', sendTestNotification);

export default router;

