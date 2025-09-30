import { Router } from 'express';
import {
  updateChainPaths,
  freezeSubtree,
  getChainPaths,
  getSubtreeStats
} from '../controllers/pathController';
import { validateUUID } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   POST /api/paths/:chainId/update
// @desc    Recalculate and store all paths for a chain
// @access  Private
router.post('/:chainId/update', authenticate, validateUUID('chainId'), updateChainPaths);

// @route   POST /api/paths/:chainId/freeze/:subtreeRootId
// @desc    Freeze a subtree's rewards
// @access  Private
router.post('/:chainId/freeze/:subtreeRootId', authenticate, validateUUID('chainId'), validateUUID('subtreeRootId'), freezeSubtree);

// @route   GET /api/paths/:chainId
// @desc    Get all paths for a chain with reward info
// @access  Private
router.get('/:chainId', authenticate, validateUUID('chainId'), getChainPaths);

// @route   GET /api/paths/:chainId/subtree-stats
// @desc    Get subtree statistics for creator dashboard
// @access  Private (Creator only)
router.get('/:chainId/subtree-stats', authenticate, validateUUID('chainId'), getSubtreeStats);

export default router;