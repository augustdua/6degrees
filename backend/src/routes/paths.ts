import { Router } from 'express';
import {
  updateChainPaths,
  getChainPaths
} from '../controllers/pathController';
import { validateUUID } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// @route   POST /api/paths/:chainId/update
// @desc    Recalculate and store all paths for a chain
// @access  Private
router.post('/:chainId/update', authenticate, validateUUID('chainId'), updateChainPaths);

// @route   GET /api/paths/:chainId
// @desc    Get all paths for a chain
// @access  Private
router.get('/:chainId', authenticate, validateUUID('chainId'), getChainPaths);

export default router;