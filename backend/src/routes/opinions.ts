import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getNextOpinionCardForUser, recordOpinionSwipe } from '../services/opinionCardService';

const router = Router();

router.use(authenticate);

// GET /api/opinions/next
router.get('/next', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const card = await getNextOpinionCardForUser(userId);
    res.json({
      card: card
        ? {
            id: card.id,
            type: 'swipe_opinion',
            statement: card.generated_statement,
          }
        : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// POST /api/opinions/swipe { cardId, direction }
router.post('/swipe', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cardId = String(req.body?.cardId || '').trim();
    const direction = String(req.body?.direction || '').trim();
    if (!cardId) {
      res.status(400).json({ error: 'cardId is required' });
      return;
    }
    if (direction !== 'left' && direction !== 'right') {
      res.status(400).json({ error: 'direction must be left or right' });
      return;
    }
    await recordOpinionSwipe(userId, cardId, direction as any);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

export default router;


