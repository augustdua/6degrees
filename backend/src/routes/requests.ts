import { Router } from 'express';
import {
  createRequest,
  updateRequest,
  getMyRequests,
  getRequestByLink,
  joinChain,
  completeChain
} from '../controllers/requestController';
import { validate, createRequestSchema, validateUUID } from '../middleware/validation';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requestLimiter } from '../middleware/rateLimiter';

const router = Router();

// @route   POST /api/requests
// @desc    Create a new connection request
// @access  Private
router.post('/', authenticate, requestLimiter, validate(createRequestSchema), createRequest);

// @route   PATCH /api/requests/:requestId
// @desc    Update a connection request
// @access  Private
router.patch('/:requestId', authenticate, validateUUID('requestId'), updateRequest);

// @route   GET /api/requests/my-requests
// @desc    Get user's connection requests
// @access  Private
router.get('/my-requests', authenticate, getMyRequests);

// @route   GET /api/requests/share/:linkId
// @desc    Get connection request by shareable link
// @access  Public
router.get('/share/:linkId', optionalAuth, getRequestByLink);

// @route   POST /api/requests/:requestId/join
// @desc    Join a connection chain
// @access  Private
router.post('/:requestId/join', authenticate, validateUUID('requestId'), joinChain);

// @route   POST /api/requests/:requestId/complete
// @desc    Complete a connection chain
// @access  Private
router.post('/:requestId/complete', authenticate, validateUUID('requestId'), completeChain);

export default router;


