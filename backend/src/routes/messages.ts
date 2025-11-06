import express, { Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { authenticateTelegram } from '../middleware/telegramAuth';
import { getConversations } from '../controllers/messagesController';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

/**
 * Dual authentication middleware
 * Tries JWT auth first, falls back to Telegram auth if JWT fails
 */
const authenticateDual = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Try JWT authentication first
  authenticate(req, res, (error?: any) => {
    if (error || !req.user) {
      // JWT failed, try Telegram auth
      authenticateTelegram(req, res, next);
    } else {
      // JWT succeeded
      next();
    }
  });
};

// All routes require authentication (JWT or Telegram)
router.use(authenticateDual);

// Get conversations
router.get('/conversations', getConversations);

export default router;


