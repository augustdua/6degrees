import { Router } from 'express';
import { 
  requestIntro, 
  getMyIntroRequests, 
  getAllIntroRequests,
  updateIntroRequestStatus 
} from '../controllers/introRequestController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/request', requestIntro);
router.get('/my-requests', getMyIntroRequests);

// Admin routes
router.get('/all', getAllIntroRequests);
router.patch('/:requestId/status', updateIntroRequestStatus);

export default router;





