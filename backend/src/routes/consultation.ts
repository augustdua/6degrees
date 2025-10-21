import express from 'express';
import { startConsultationCall } from '../controllers/consultationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/consultation/start
 * @desc    Start a consultation call with AI co-pilot
 * @access  Private
 */
router.post('/start', authenticate, startConsultationCall);

export default router;

