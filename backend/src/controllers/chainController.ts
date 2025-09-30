import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import supabase from '../config/database';

// Stub controller - to be implemented with Supabase
export const getMyChains = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain functionality not yet implemented'
  });
};

export const getChainById = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain functionality not yet implemented'
  });
};

export const getMyRewards = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Rewards functionality not yet implemented'
  });
};

export const getChainStats = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain statistics functionality not yet implemented'
  });
};

/**
 * Calculate current reward with decay applied
 * Decay rate: 0.001 per hour (2.4% per day)
 * Freeze duration: 12 hours after adding a child
 */
export const calculateRewardWithDecay = (
  participant: any,
  baseReward: number
): number => {
  const DECAY_RATE_PER_HOUR = 0.001;
  const now = new Date();
  const joinedAt = new Date(participant.joinedAt);

  // Calculate hours since joining
  const hoursSinceJoined = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60);

  // Check if reward is currently frozen
  const isFrozen = participant.freezeUntil && new Date(participant.freezeUntil) > now;

  if (isFrozen) {
    // If frozen, calculate decay only up until freeze started
    const freezeStartedAt = participant.lastChildAddedAt
      ? new Date(participant.lastChildAddedAt)
      : joinedAt;
    const hoursBeforeFreeze = (freezeStartedAt.getTime() - joinedAt.getTime()) / (1000 * 60 * 60);
    const decayAmount = Math.max(0, hoursBeforeFreeze * DECAY_RATE_PER_HOUR);
    return Math.max(0, baseReward - decayAmount);
  }

  // If not frozen, calculate total decay
  // But if there was a previous freeze, account for that time
  let effectiveHours = hoursSinceJoined;

  if (participant.lastChildAddedAt && participant.freezeUntil) {
    const lastFreezeEnd = new Date(participant.freezeUntil);
    if (lastFreezeEnd < now) {
      // Freeze period has ended, subtract the 12 frozen hours from decay calculation
      effectiveHours = hoursSinceJoined - 12;
    }
  }

  const decayAmount = Math.max(0, effectiveHours * DECAY_RATE_PER_HOUR);
  return Math.max(0, baseReward - decayAmount);
};

/**
 * Get chain with calculated rewards (including decay)
 */
export const getChainWithRewards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chainId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Fetch chain data
    const { data: chain, error } = await supabase
      .from('chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (error || !chain) {
      return res.status(404).json({
        success: false,
        message: 'Chain not found'
      });
    }

    // Calculate current rewards for each participant
    const participantsWithRewards = chain.participants.map((participant: any) => {
      const baseReward = participant.baseReward || 0;
      const currentReward = calculateRewardWithDecay(participant, baseReward);

      return {
        ...participant,
        currentReward: parseFloat(currentReward.toFixed(5)), // 5 decimal places
        decayActive: !participant.freezeUntil || new Date(participant.freezeUntil) < new Date(),
        freezeUntil: participant.freezeUntil
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        ...chain,
        participants: participantsWithRewards
      }
    });
  } catch (error) {
    console.error('Error fetching chain with rewards:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chain data'
    });
  }
};