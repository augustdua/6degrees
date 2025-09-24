import express from 'express';
import { linkedInTokenExchange } from '../controllers/linkedInController';

const router = express.Router();

// LinkedIn OAuth token exchange endpoint
router.post('/token', linkedInTokenExchange);

export default router;