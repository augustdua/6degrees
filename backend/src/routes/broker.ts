import express from 'express';
import { authenticate } from '../middleware/auth';
import { registerBroker, createVerificationLink } from '../controllers/brokerController';

const router = express.Router();

router.post('/register', authenticate, registerBroker);
router.post('/verifications', authenticate, createVerificationLink);

export default router;












