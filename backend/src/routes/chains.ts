import { Router } from 'express';
import {
  getMyChains,
  getChainById,
  getMyRewards,
  getChainStats,
  getChainWithRewards
} from '../controllers/chainController';
import { validateUUID } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   GET /api/chains/my-chains
// @desc    Get user's chains
// @access  Private
router.get('/my-chains', authenticate, getMyChains);

// @route   GET /api/chains/:chainId/rewards
// @desc    Get chain with calculated rewards (including decay)
// @access  Private
router.get('/:chainId/rewards', authenticate, validateUUID('chainId'), getChainWithRewards);

// @route   GET /api/chains/:id
// @desc    Get chain by ID
// @access  Private
router.get('/:id', authenticate, validateUUID('id'), getChainById);

// @route   GET /api/chains/rewards
// @desc    Get user's rewards
// @access  Private
router.get('/rewards', authenticate, getMyRewards);

// @route   GET /api/chains/stats
// @desc    Get user's chain statistics
// @access  Private
router.get('/stats', authenticate, getChainStats);

export default router;


