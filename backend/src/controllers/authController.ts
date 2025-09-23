import { Response } from 'express';
import UserModel from '../models/User';
import { generateTokenPair } from '../utils/jwt';
import { AuthenticatedRequest, RegisterData, LoginData, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, firstName, lastName }: RegisterData = req.body;

  // Check if user already exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Create user
  const user = await UserModel.create({
    email,
    password,
    firstName,
    lastName
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  const response: ApiResponse = {
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
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
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  };

  res.status(201).json(response);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password }: LoginData = req.body;

  // Check if user exists
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await UserModel.comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  const response: ApiResponse = {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
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
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  const response: ApiResponse = {
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: {
        id: user.id,
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

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError('Refresh token is required', 400);
  }

  // Verify refresh token
  const { verifyToken } = await import('../utils/jwt');
  const decoded = verifyToken(refreshToken);

  // Get user
  const user = await UserModel.findById(decoded.userId);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

  const response: ApiResponse = {
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    }
  };

  res.status(200).json(response);
});


