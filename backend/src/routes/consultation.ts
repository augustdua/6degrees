import express from 'express';
import { startConsultationCall } from '../controllers/consultationController';

const router = express.Router();

/**
 * @route   POST /api/consultation/start
 * @desc    Start a consultation call with AI co-pilot
 * @access  Public (for testing/demo purposes)
 */
router.post('/start', startConsultationCall);

export default router;

