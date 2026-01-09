import express from 'express';
import { linkedInTokenExchange, scrapeLinkedInProfile } from '../controllers/linkedInController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// LinkedIn OAuth token exchange endpoint
router.post('/token', linkedInTokenExchange);

// LinkedIn profile enrichment via Apify scrape
router.post('/scrape', authenticate, scrapeLinkedInProfile);

export default router;