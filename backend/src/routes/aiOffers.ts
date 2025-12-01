import { Router } from 'express';
import { generateOffers, getForYouOffers, getGenerationHistory } from '../controllers/aiOffersController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All AI offer routes require authentication
router.use(authenticate);

// @route   POST /api/ai-offers/generate
// @desc    Generate 3 personalized offers using Gemini
// @access  Private
router.post('/generate', generateOffers);

// @route   GET /api/ai-offers/for-you
// @desc    Get existing personalized "For You" offers
// @access  Private
router.get('/for-you', getForYouOffers);

// @route   GET /api/ai-offers/history
// @desc    Get user's AI generation history
// @access  Private
router.get('/history', getGenerationHistory);

export default router;

