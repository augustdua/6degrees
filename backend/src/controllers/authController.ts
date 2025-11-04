import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { generateTokenPair } from '../utils/jwt';
import { AuthenticatedRequest, RegisterData, LoginData, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, firstName, lastName }: RegisterData = req.body;

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const { data: user, error: createUserError } = await supabase
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      is_verified: false
    })
    .select('id, email, first_name, last_name, full_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at')
    .single();

  if (createUserError || !user) {
    throw createError('Failed to create user', 500);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.profile_picture_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.created_at),
    password: '' // Not included in response
  });

  const response: ApiResponse = {
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        avatar: user.profile_picture_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
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
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, password, first_name, last_name, full_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
    .eq('email', email)
    .single();

  if (userError || !user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.profile_picture_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at || user.created_at),
    password: '' // Not included in response
  });

  const response: ApiResponse = {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        avatar: user.profile_picture_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
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
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, full_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
    .eq('id', decoded.userId)
    .single();

  if (userError || !user) {
    throw createError('User not found', 404);
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.profile_picture_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at || user.created_at),
    password: '' // Not included in response
  });

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