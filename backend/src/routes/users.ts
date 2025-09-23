import { Router } from 'express';
import { updateProfile, getUserById, searchUsers } from '../controllers/userController';
import { validate, updateProfileSchema, validateUUID } from '../middleware/validation';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', validateUUID('id'), getUserById);

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', optionalAuth, searchUsers);

export default router;


