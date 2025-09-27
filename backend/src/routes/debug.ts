import express from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Debug endpoint to check environment
router.get('/env-check', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      PRODUCTION_FRONTEND_URL: process.env.PRODUCTION_FRONTEND_URL
    },
    message: 'Environment check complete'
  });
});

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