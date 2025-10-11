import { Router } from 'express';
import {
  updateProfile,
  getUserById,
  searchUsers,
  uploadAvatarPhoto,
  generateUserAvatar,
  createAndTrainAvatar,
  getAvatarStatus,
  refreshAvatarData,
  generateNewLook,
  deleteAvatarGroup,
  photoUploadMiddleware
} from '../controllers/userController';
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

// --- HeyGen Photo Avatar Endpoints ---

// @route   POST /api/users/avatar/upload
// @desc    Upload user photo (returns guidance - not fully implemented)
// @access  Private
router.post('/avatar/upload', authenticate, photoUploadMiddleware, uploadAvatarPhoto);

// @route   POST /api/users/avatar/generate
// @desc    Generate cartoon avatar from user's photo URL
// @access  Private
router.post('/avatar/generate', authenticate, generateUserAvatar);

// @route   POST /api/users/avatar/train
// @desc    Create and train avatar group from generated images
// @access  Private
router.post('/avatar/train', authenticate, createAndTrainAvatar);

// @route   GET /api/users/avatar/status
// @desc    Check avatar training status
// @access  Private
router.get('/avatar/status', authenticate, getAvatarStatus);

// @route   POST /api/users/avatar/refresh
// @desc    Refresh avatar data from HeyGen (get correct preview URL)
// @access  Private
router.post('/avatar/refresh', authenticate, refreshAvatarData);

// @route   POST /api/users/avatar/looks/generate
// @desc    Generate new look (outfit/style) for user's avatar
// @access  Private
router.post('/avatar/looks/generate', authenticate, generateNewLook);

// @route   DELETE /api/users/avatar
// @desc    Delete user's avatar group
// @access  Private
router.delete('/avatar', authenticate, deleteAvatarGroup);

export default router;


