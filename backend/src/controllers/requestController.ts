import { Response } from 'express';
import ConnectionRequest from '../models/ConnectionRequest';
import Chain from '../models/Chain';
import { AuthenticatedRequest, CreateRequestData, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Create connection request
// @route   POST /api/requests
// @access  Private
export const createRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const { target, message, reward }: CreateRequestData = req.body;

  // Create connection request
  const connectionRequest = await ConnectionRequest.create({
    creator: userId,
    target,
    message: message || '',
    reward
  });

  // Create initial chain with creator as first participant
  const chain = await Chain.create({
    requestId: connectionRequest._id,
    participants: [{
      userId: userId,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: 'creator',
      joinedAt: new Date(),
      rewardAmount: 0
    }],
    totalReward: reward
  });

  const response: ApiResponse = {
    success: true,
    message: 'Connection request created successfully',
    data: {
      request: {
        id: connectionRequest._id,
        target: connectionRequest.target,
        message: connectionRequest.message,
        reward: connectionRequest.reward,
        status: connectionRequest.status,
        expiresAt: connectionRequest.expiresAt,
        shareableLink: connectionRequest.shareableLink,
        createdAt: connectionRequest.createdAt
      },
      chain: {
        id: chain._id,
        participants: chain.participants,
        status: chain.status,
        totalReward: chain.totalReward,
        createdAt: chain.createdAt
      }
    }
  };

  res.status(201).json(response);
});

// @desc    Get user's connection requests
// @route   GET /api/requests/my-requests
// @access  Private
export const getMyRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query: any = { creator: userId };
  if (status && typeof status === 'string') {
    query.status = status;
  }

  const requests = await ConnectionRequest.find(query)
    .populate('creator', 'firstName lastName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await ConnectionRequest.countDocuments(query);

  const response: ApiResponse = {
    success: true,
    message: 'Requests retrieved successfully',
    data: {
      requests: requests.map(request => ({
        id: request._id,
        target: request.target,
        message: request.message,
        reward: request.reward,
        status: request.status,
        expiresAt: request.expiresAt,
        shareableLink: request.shareableLink,
        isExpired: request.isExpired,
        isActive: request.isActive,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
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

// @desc    Get connection request by shareable link
// @route   GET /api/requests/share/:linkId
// @access  Public
export const getRequestByLink = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { linkId } = req.params;
  const shareableLink = `https://6degrees.app/r/${linkId}`;

  const request = await ConnectionRequest.findOne({ shareableLink })
    .populate('creator', 'firstName lastName email avatar bio linkedinUrl twitterUrl');

  if (!request) {
    throw createError('Connection request not found', 404);
  }

  if (!request.isActive) {
    throw createError('This connection request is no longer active', 400);
  }

  // Get associated chain
  const chain = await Chain.findOne({ requestId: request._id })
    .populate('participants.userId', 'firstName lastName email avatar');

  const response: ApiResponse = {
    success: true,
    message: 'Request retrieved successfully',
    data: {
      request: {
        id: request._id,
        target: request.target,
        message: request.message,
        reward: request.reward,
        status: request.status,
        expiresAt: request.expiresAt,
        shareableLink: request.shareableLink,
        isExpired: request.isExpired,
        isActive: request.isActive,
        createdAt: request.createdAt,
        creator: {
          id: request.creator._id,
          firstName: request.creator.firstName,
          lastName: request.creator.lastName,
          email: request.creator.email,
          avatar: request.creator.avatar,
          bio: request.creator.bio,
          linkedinUrl: request.creator.linkedinUrl,
          twitterUrl: request.creator.twitterUrl
        }
      },
      chain: chain ? {
        id: chain._id,
        participants: chain.participants.map(p => ({
          userId: p.userId._id,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role,
          joinedAt: p.joinedAt,
          rewardAmount: p.rewardAmount
        })),
        status: chain.status,
        totalReward: chain.totalReward,
        chainLength: chain.chainLength,
        createdAt: chain.createdAt
      } : null
    }
  };

  res.status(200).json(response);
});

// @desc    Join chain
// @route   POST /api/requests/:requestId/join
// @access  Private
export const joinChain = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  const userId = req.user!._id;

  // Check if request exists and is active
  const request = await ConnectionRequest.findById(requestId);
  if (!request) {
    throw createError('Connection request not found', 404);
  }

  if (!request.isActive) {
    throw createError('This connection request is no longer active', 400);
  }

  // Check if user is the creator
  if (request.creator.toString() === userId.toString()) {
    throw createError('You cannot join your own chain', 400);
  }

  // Get the chain
  const chain = await Chain.findOne({ requestId });
  if (!chain) {
    throw createError('Chain not found', 404);
  }

  if (chain.status !== 'active') {
    throw createError('This chain is no longer active', 400);
  }

  // Add user to chain
  try {
    await chain.addParticipant({
      userId: userId,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      role: 'forwarder',
      joinedAt: new Date(),
      rewardAmount: 0
    });

    const response: ApiResponse = {
      success: true,
      message: 'Successfully joined the chain',
      data: {
        chain: {
          id: chain._id,
          participants: chain.participants,
          status: chain.status,
          totalReward: chain.totalReward,
          chainLength: chain.chainLength,
          createdAt: chain.createdAt,
          updatedAt: chain.updatedAt
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in this chain')) {
      throw createError('You are already part of this chain', 400);
    }
    throw error;
  }
});

// @desc    Complete chain
// @route   POST /api/requests/:requestId/complete
// @access  Private
export const completeChain = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  const userId = req.user!._id;

  // Check if request exists
  const request = await ConnectionRequest.findById(requestId);
  if (!request) {
    throw createError('Connection request not found', 404);
  }

  // Check if user is the creator
  if (request.creator.toString() !== userId.toString()) {
    throw createError('Only the creator can complete the chain', 403);
  }

  if (request.status !== 'active') {
    throw createError('This request is already completed or cancelled', 400);
  }

  // Get the chain
  const chain = await Chain.findOne({ requestId });
  if (!chain) {
    throw createError('Chain not found', 404);
  }

  if (chain.status !== 'active') {
    throw createError('This chain is already completed', 400);
  }

  // Update request status
  request.status = 'completed';
  await request.save();

  // Update chain status
  chain.status = 'completed';
  chain.completedAt = new Date();
  chain.calculateRewards();
  await chain.save();

  const response: ApiResponse = {
    success: true,
    message: 'Chain completed successfully! Rewards will be distributed to all participants.',
    data: {
      request: {
        id: request._id,
        status: request.status,
        completedAt: chain.completedAt
      },
      chain: {
        id: chain._id,
        status: chain.status,
        participants: chain.participants,
        totalReward: chain.totalReward,
        completedAt: chain.completedAt
      }
    }
  };

  res.status(200).json(response);
});


