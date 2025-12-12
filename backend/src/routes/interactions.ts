import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { trackInteractionBatch } from '../controllers/interactionsController';

const router = Router();

router.use(authenticate);
router.post('/track-batch', trackInteractionBatch);

export default router;



