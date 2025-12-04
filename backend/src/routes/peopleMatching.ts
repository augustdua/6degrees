import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSwipeableUsers,
  recordSwipe,
  getMatches,
  scheduleMatchCall,
  undoLastSwipe,
  getSwipeStats
} from '../controllers/peopleMatchingController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get users for swipe deck
router.get('/swipeable', getSwipeableUsers);

// Record a swipe
router.post('/swipe', recordSwipe);

// Undo last swipe (within 30 seconds)
router.post('/swipe/undo', undoLastSwipe);

// Get user's matches
router.get('/matches', getMatches);

// Schedule a call with a match
router.post('/matches/schedule-call', scheduleMatchCall);

// Get swipe statistics
router.get('/stats', getSwipeStats);

export default router;

