import { Router } from 'express';
import {
  handleNewMessageEmail,
  handleConnectionRequestEmail,
  handleConnectionAcceptedEmail,
  handleUnreadMessagesDigest,
} from '../controllers/notificationController';

const router = Router();

/**
 * Webhook endpoints for database triggers
 * These endpoints are called by Supabase when certain events occur
 */

// Send email when a new message is created (NOT USED - replaced by digest)
router.post('/webhooks/new-message', handleNewMessageEmail);

// Send email when a connection request is created (IMMEDIATE)
router.post('/webhooks/connection-request', handleConnectionRequestEmail);

// Send email when a connection request is accepted (IMMEDIATE)
router.post('/webhooks/connection-accepted', handleConnectionAcceptedEmail);

// Send unread messages digest (HOURLY via pg_cron)
router.post('/webhooks/unread-messages-digest', handleUnreadMessagesDigest);

export default router;

