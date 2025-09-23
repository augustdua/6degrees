import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getRequestAnalytics,
  getClickAnalytics,
  getChainAnalytics
} from '../controllers/analyticsController';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

// GET /api/analytics/requests - Get user's request analytics
router.get('/requests', getRequestAnalytics);

// GET /api/analytics/clicks/:requestId - Get click analytics for a specific request
router.get('/clicks/:requestId', getClickAnalytics);

// GET /api/analytics/chain/:requestId - Get chain analytics for a specific request
router.get('/chain/:requestId', getChainAnalytics);

export default router;