import express, { Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import {
  calculateUserScore,
  getScoreBreakdown,
  scoreConnection
} from '../services/socialCapitalService';

const router = express.Router();

/**
 * POST /api/social-capital/calculate/:userId
 * Calculate or recalculate a user's social capital score
 */
router.post('/calculate/:userId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Only allow users to calculate their own score
    if (userId !== requestingUserId) {
      res.status(403).json({ error: 'You can only calculate your own score' });
      return;
    }

    const score = await calculateUserScore(userId);

    res.json({
      score,
      message: 'Social capital score calculated successfully'
    });
  } catch (error: any) {
    console.error('Error calculating social capital score:', error);
    res.status(500).json({ error: 'Failed to calculate social capital score' });
  }
});

/**
 * GET /api/social-capital/breakdown/:userId
 * Get detailed score breakdown for a user
 */
router.get('/breakdown/:userId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Only allow users to view their own detailed breakdown
    if (userId !== requestingUserId) {
      res.status(403).json({ error: 'You can only view your own score breakdown' });
      return;
    }

    const breakdown = await getScoreBreakdown(userId);

    res.json(breakdown);
  } catch (error: any) {
    console.error('Error fetching score breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch score breakdown' });
  }
});

/**
 * POST /api/social-capital/score-connection
 * Score a single connection (for preview before adding)
 */
router.post('/score-connection', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationName, position, organizationDomain } = req.body;

    if (!organizationName || !position) {
      res.status(400).json({ error: 'organizationName and position are required' });
      return;
    }

    const score = await scoreConnection(organizationName, position, organizationDomain);

    res.json({
      organizationScore: score.organizationScore,
      roleScore: score.roleScore,
      totalScore: score.organizationScore + score.roleScore,
      reasoning: score.reasoning
    });
  } catch (error: any) {
    console.error('Error scoring connection:', error);
    res.status(500).json({ error: 'Failed to score connection' });
  }
});

/**
 * GET /api/social-capital/leaderboard
 * Get top users by social capital score
 */
router.get('/leaderboard', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { getSupabase } = await import('../config/supabase');
    const supabase = getSupabase();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url, social_capital_score, social_capital_score_updated_at')
      .not('social_capital_score', 'is', null)
      .gt('social_capital_score', 0)
      .order('social_capital_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    res.json({ users: users || [] });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;

