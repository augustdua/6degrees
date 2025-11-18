import express from 'express';
import { getNews } from '../controllers/newsController';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/news
 * Fetch latest news from Inc42 RSS feed
 * Public endpoint with optional auth (works for both guests and authenticated users)
 */
router.get('/', optionalAuth, getNews);

export default router;

