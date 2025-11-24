import { Router } from 'express';
import { createInviteNotification } from '../controllers/invitesController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // All invite routes require authentication

// @route   POST /api/invites/notifications
// @desc    Create an invite notification
// @access  Private
router.post('/notifications', createInviteNotification);

export default router;

