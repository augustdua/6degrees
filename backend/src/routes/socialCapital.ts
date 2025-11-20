import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
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
router.post('/calculate/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.userId;

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
router.get('/breakdown/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.userId;

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
router.post('/score-connection', authenticateToken, async (req: Request, res: Response) => {
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

export default router;

