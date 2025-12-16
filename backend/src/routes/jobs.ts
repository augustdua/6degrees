import express from 'express';
import { runDailyMarketGaps, runDailyMarketResearch } from '../controllers/jobsController';
import { previewDailyIdeas } from '../controllers/ideasController';

const router = express.Router();

// These routes are intended for Railway cron. Protect them with CRON_SECRET (checked in controller).
router.post('/market-research/daily', runDailyMarketResearch);
router.post('/market-gaps/daily', runDailyMarketGaps);
router.post('/ideas/preview', previewDailyIdeas);

export default router;



