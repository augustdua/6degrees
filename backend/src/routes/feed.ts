import express from 'express';
import { auth, optionalAuth } from '../middleware/auth';
import {
  getFeedData,
  getFeedStats
} from '../controllers/feedController';

const router = express.Router();

// Get feed data (authentication optional for public viewing)
router.get('/data', optionalAuth, getFeedData);

// Get feed stats (counts for tabs)
router.get('/stats', getFeedStats);

export default router;