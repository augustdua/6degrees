import { Router } from 'express';
import Joi from 'joi';
import {
  sendMessage,
  getHistory,
  getContext,
  getSuggestions,
  executeAction,
  endSession,
} from '../controllers/aiAssistantController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas using Joi
const sendMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Message is required',
    'any.required': 'Message is required'
  }),
  sessionId: Joi.string().uuid().optional(),
  currentPage: Joi.string().optional(),
  context: Joi.object().optional()
});

const executeActionSchema = Joi.object({
  actionType: Joi.string().required().messages({
    'any.required': 'Action type is required'
  }),
  actionData: Joi.object().required().messages({
    'any.required': 'Action data is required',
    'object.base': 'Action data must be an object'
  }),
  sessionId: Joi.string().uuid().optional(),
  messageId: Joi.string().uuid().optional()
});

const endSessionSchema = Joi.object({
  sessionId: Joi.string().uuid().required().messages({
    'any.required': 'Session ID is required',
    'string.guid': 'Valid session ID is required'
  })
});

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
