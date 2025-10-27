import { Router } from 'express';
import { workosCallback } from '../controllers/authController';
import { register, login, getMe, refreshToken } from '../controllers/authController';
import { validate, registerSchema, loginSchema } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, validate(registerSchema), register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, validate(loginSchema), login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, getMe);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', refreshToken);

export default router;

// Public WorkOS callback (no auth)
router.get('/workos/callback', workosCallback);


