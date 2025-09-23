import { Router } from 'express';
import { trackLinkClick, getLinkClickStats } from '../controllers/clickController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to click tracking
router.use(generalLimiter);

// POST /api/clicks/track/:linkId - Track a link click
router.post('/track/:linkId', trackLinkClick);

// GET /api/clicks/stats/:linkId - Get click statistics for a link (public endpoint)
router.get('/stats/:linkId', getLinkClickStats);

export default router;