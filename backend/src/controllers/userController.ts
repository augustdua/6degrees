import { Response } from 'express';
import User from '../models/User';
import { AuthenticatedRequest, UpdateProfileData, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const updateData: UpdateProfileData = req.body;

  // Remove fields that shouldn't be updated directly
  const { email, password, ...allowedUpdates } = updateData;

  const user = await User.findByIdAndUpdate(
    userId,
    allowedUpdates,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        twitterUrl: user.twitterUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');
  if (!user) {
    throw createError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'User retrieved successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        twitterUrl: user.twitterUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
export const searchUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || typeof q !== 'string') {
    throw createError('Search query is required', 400);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Search in firstName, lastName, and email
  const searchRegex = new RegExp(q, 'i');
  const users = await User.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ]
  })
    .select('-password')
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ]
  });

  const response: ApiResponse = {
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        twitterUrl: user.twitterUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  };

  res.status(200).json(response);
});


