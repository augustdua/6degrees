import { Router } from 'express';
import { 
  sendInvite, 
  getMyInvites, 
  validateInviteCode, 
  completeSignup 
} from '../controllers/userInvitesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes (no auth required - for onboarding)
// @route   POST /api/user-invites/validate
// @desc    Validate an invite code
// @access  Public
router.post('/validate', validateInviteCode);

// @route   POST /api/user-invites/complete-signup
// @desc    Complete signup with invite code
// @access  Public
router.post('/complete-signup', completeSignup);

// Protected routes (require auth)
// @route   POST /api/user-invites/send
// @desc    Send an invite to an email address
// @access  Private
router.post('/send', authenticate, sendInvite);

// @route   GET /api/user-invites/my-invites
// @desc    Get user's sent invites and remaining count
// @access  Private
router.get('/my-invites', authenticate, getMyInvites);

export default router;

