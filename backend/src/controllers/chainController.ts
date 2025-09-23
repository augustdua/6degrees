import { Response } from 'express';
import Chain from '../models/Chain';
import Reward from '../models/Reward';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Get user's chains
// @route   GET /api/chains/my-chains
// @access  Private
export const getMyChains = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query - find chains where user is a participant
  const query: any = { 'participants.userId': userId };
  if (status && typeof status === 'string') {
    query.status = status;
  }

  const chains = await Chain.find(query)
    .populate('requestId', 'target message reward status expiresAt shareableLink')
    .populate('participants.userId', 'firstName lastName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Chain.countDocuments(query);

  const response: ApiResponse = {
    success: true,
    message: 'Chains retrieved successfully',
    data: {
      chains: chains.map(chain => ({
        id: chain._id,
        request: {
          id: chain.requestId._id,
          target: chain.requestId.target,
          message: chain.requestId.message,
          reward: chain.requestId.reward,
          status: chain.requestId.status,
          expiresAt: chain.requestId.expiresAt,
          shareableLink: chain.requestId.shareableLink
        },
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
        completedAt: chain.completedAt,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt
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

// @desc    Get chain by ID
// @route   GET /api/chains/:id
// @access  Private
export const getChainById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!._id;

  const chain = await Chain.findById(id)
    .populate('requestId', 'target message reward status expiresAt shareableLink creator')
    .populate('participants.userId', 'firstName lastName email avatar bio linkedinUrl twitterUrl');

  if (!chain) {
    throw createError('Chain not found', 404);
  }

  // Check if user is part of this chain
  const isParticipant = chain.participants.some(
    p => p.userId._id.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw createError('You are not authorized to view this chain', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Chain retrieved successfully',
    data: {
      chain: {
        id: chain._id,
        request: {
          id: chain.requestId._id,
          target: chain.requestId.target,
          message: chain.requestId.message,
          reward: chain.requestId.reward,
          status: chain.requestId.status,
          expiresAt: chain.requestId.expiresAt,
          shareableLink: chain.requestId.shareableLink,
          creator: chain.requestId.creator
        },
        participants: chain.participants.map(p => ({
          userId: p.userId._id,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          avatar: p.userId.avatar,
          bio: p.userId.bio,
          linkedinUrl: p.userId.linkedinUrl,
          twitterUrl: p.userId.twitterUrl,
          role: p.role,
          joinedAt: p.joinedAt,
          rewardAmount: p.rewardAmount
        })),
        status: chain.status,
        totalReward: chain.totalReward,
        chainLength: chain.chainLength,
        completedAt: chain.completedAt,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Get user's rewards
// @route   GET /api/chains/rewards
// @access  Private
export const getMyRewards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query: any = { userId };
  if (status && typeof status === 'string') {
    query.status = status;
  }

  const rewards = await Reward.find(query)
    .populate('chainId', 'requestId totalReward status completedAt')
    .populate({
      path: 'chainId',
      populate: {
        path: 'requestId',
        select: 'target reward creator'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Reward.countDocuments(query);

  const response: ApiResponse = {
    success: true,
    message: 'Rewards retrieved successfully',
    data: {
      rewards: rewards.map(reward => ({
        id: reward._id,
        amount: reward.amount,
        status: reward.status,
        paidAt: reward.paidAt,
        createdAt: reward.createdAt,
        chain: {
          id: reward.chainId._id,
          totalReward: reward.chainId.totalReward,
          status: reward.chainId.status,
          completedAt: reward.chainId.completedAt,
          request: {
            id: reward.chainId.requestId._id,
            target: reward.chainId.requestId.target,
            reward: reward.chainId.requestId.reward,
            creator: reward.chainId.requestId.creator
          }
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      summary: {
        totalEarned: rewards.reduce((sum, reward) => 
          reward.status === 'paid' ? sum + reward.amount : sum, 0
        ),
        pendingAmount: rewards.reduce((sum, reward) => 
          reward.status === 'pending' ? sum + reward.amount : sum, 0
        ),
        totalRewards: rewards.length
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Get chain statistics
// @route   GET /api/chains/stats
// @access  Private
export const getChainStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!._id;

  // Get user's chain statistics
  const totalChains = await Chain.countDocuments({ 'participants.userId': userId });
  const activeChains = await Chain.countDocuments({ 
    'participants.userId': userId, 
    status: 'active' 
  });
  const completedChains = await Chain.countDocuments({ 
    'participants.userId': userId, 
    status: 'completed' 
  });

  // Get reward statistics
  const totalEarned = await Reward.aggregate([
    { $match: { userId: userId, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const pendingRewards = await Reward.aggregate([
    { $match: { userId: userId, status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Statistics retrieved successfully',
    data: {
      chains: {
        total: totalChains,
        active: activeChains,
        completed: completedChains
      },
      rewards: {
        totalEarned: totalEarned[0]?.total || 0,
        pendingAmount: pendingRewards[0]?.total || 0
      }
    }
  };

  res.status(200).json(response);
});


