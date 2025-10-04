import { Router } from 'express';
import { trackLinkClick, getLinkClickStats, getRequestShares } from '../controllers/clickController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to click tracking
router.use(generalLimiter);

// POST /api/clicks/track/:linkId - Track a link click
router.post('/track/:linkId', trackLinkClick);

// GET /api/clicks/stats/:linkId - Get click statistics for a link (public endpoint)
router.get('/stats/:linkId', getLinkClickStats);

// GET /api/clicks/shares/:requestId - Combined shares for a request (public)
router.get('/shares/:requestId', getRequestShares);

export default router;