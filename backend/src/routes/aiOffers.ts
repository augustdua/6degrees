import { Router } from 'express';
import { generateOffers, getForYouOffers } from '../controllers/aiOffersController';
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

export default router;

