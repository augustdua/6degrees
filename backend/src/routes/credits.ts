import express from 'express';
import { auth } from '../middleware/auth';
import {
  getUserCredits,
  getCreditTransactions,
  awardCredits,
  spendCredits,
  handleJoinChainCredits,
  unlockChain,
  toggleChainLike
} from '../controllers/creditsController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get user's current credit balance
router.get('/balance', getUserCredits);

// Get user's credit transaction history
router.get('/transactions', getCreditTransactions);

// Award credits to user
router.post('/award', awardCredits);

// Spend credits
router.post('/spend', spendCredits);

// Handle join chain credits (award to both joiner and creator)
router.post('/join-chain', handleJoinChainCredits);

// Unlock completed chain
router.post('/unlock-chain', unlockChain);

// Toggle chain like
router.post('/like', toggleChainLike);

export default router;