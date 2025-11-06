import express from 'express';
import { authenticate } from '../middleware/auth';
import { getConversations } from '../controllers/messagesController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get conversations
router.get('/conversations', getConversations);

export default router;

