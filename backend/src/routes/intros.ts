import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMyIntros,
  startIntroCall,
  getIntroJoinDetails,
  completeIntroCall
} from '../controllers/introController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/my', getMyIntros);
router.post('/:id/start', startIntroCall);
router.get('/:id/join', getIntroJoinDetails);
router.post('/:id/complete', completeIntroCall);

export default router;

