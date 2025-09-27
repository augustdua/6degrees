import express from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Debug endpoint to test authentication
router.get('/whoami', auth, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    } : null
  });
});

export default router;