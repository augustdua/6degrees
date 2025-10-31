import { Router } from 'express';
import {
  sendMessage,
  getHistory,
  getContext,
  getSuggestions,
  executeAction,
  endSession,
} from '../controllers/aiAssistantController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas
const sendMessageSchema = [
  body('message').isString().trim().notEmpty().withMessage('Message is required'),
  body('sessionId').optional().isUUID().withMessage('Invalid session ID'),
  body('currentPage').optional().isString(),
  body('context').optional().isObject(),
];

const executeActionSchema = [
  body('actionType').isString().notEmpty().withMessage('Action type is required'),
  body('actionData').isObject().withMessage('Action data must be an object'),
  body('sessionId').optional().isUUID(),
  body('messageId').optional().isUUID(),
];

const endSessionSchema = [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
];

// @route   POST /api/ai-assistant/chat
// @desc    Send message to AI assistant and get response
// @access  Private
router.post('/chat', authenticate, validate(sendMessageSchema), sendMessage);

// @route   GET /api/ai-assistant/history
// @desc    Get conversation history
// @access  Private
router.get('/history', authenticate, getHistory);

// @route   GET /api/ai-assistant/context
// @desc    Get user context for AI assistant
// @access  Private
router.get('/context', authenticate, getContext);

// @route   GET /api/ai-assistant/suggestions
// @desc    Get quick suggestions for current page
// @access  Private
router.get('/suggestions', authenticate, getSuggestions);

// @route   POST /api/ai-assistant/action
// @desc    Execute an action requested by AI
// @access  Private
router.post('/action', authenticate, validate(executeActionSchema), executeAction);

// @route   POST /api/ai-assistant/session/end
// @desc    End current AI chat session
// @access  Private
router.post('/session/end', authenticate, validate(endSessionSchema), endSession);

export default router;
