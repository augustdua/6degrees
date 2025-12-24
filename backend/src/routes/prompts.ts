import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { getNextOpinionCardForUser, recordOpinionSwipe } from '../services/opinionCardService';

const router = Router();
router.use(authenticate);

type PromptResponse =
  | {
      kind: 'personality';
      question: {
        id: string;
        type: 'likert' | 'binary';
        text: string;
        optionA?: string | null;
        optionB?: string | null;
        category?: string | null;
      };
      totalAnswered?: number;
    }
  | {
      kind: 'opinion_swipe';
      card: {
        id: string;
        statement: string;
      };
    };

function shouldServeOpinion(): boolean {
  // Balanced: ~1 opinion card per 2 personality prompts => ~33% opinion.
  return Math.random() < 0.33;
}

async function updatePromptedAt(userId: string): Promise<void> {
  // Used only for the very first prompt (before the user has ever answered).
  await supabase.from('users').update({ personality_last_prompted_at: new Date().toISOString() }).eq('id', userId);
}

async function updateAnsweredAt(userId: string): Promise<void> {
  await supabase.from('users').update({ prompt_last_answered_at: new Date().toISOString() }).eq('id', userId);
}

// GET /api/prompts/next
router.get('/next', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Enforce cooldown globally:
    // - After the user has answered at least once: based on users.prompt_last_answered_at
    // - Before the first-ever answer: fall back to users.personality_last_prompted_at (first prompt only)
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('personality_last_prompted_at, prompt_last_answered_at')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    const lastAnsweredAt = userRow?.prompt_last_answered_at ? new Date(userRow.prompt_last_answered_at) : null;
    const lastPromptedAt = userRow?.personality_last_prompted_at ? new Date(userRow.personality_last_prompted_at) : null;
    const basis = lastAnsweredAt || lastPromptedAt;
    if (basis) {
      const now = Date.now();
      const last = basis.getTime();
      const cooldownMs = 10 * 60 * 1000; // 10 minutes (must match personality route)
      if (now - last < cooldownMs) {
        res.json({ prompt: null, cooldown: true, cooldownUntil: new Date(last + cooldownMs).toISOString() });
        return;
      }
    }

    // Decide which prompt type to serve
    if (shouldServeOpinion()) {
      try {
        const card = await getNextOpinionCardForUser(userId);
        if (card) {
          // Only track prompted time before the first-ever answer. After that, cooldown is answer-based.
          if (!lastAnsweredAt) await updatePromptedAt(userId);
          const prompt: PromptResponse = {
            kind: 'opinion_swipe',
            card: { id: card.id, statement: card.generated_statement },
          };
          res.json({ prompt });
          return;
        }
      } catch {
        // If opinion infra is temporarily unavailable (e.g., schema cache propagation), fall back to personality.
      }
      // fall through to personality if no cards
    }

    // Personality: pick random unanswered question (same logic as /api/personality/next-question)
    const { data: answeredQuestions, error: answeredErr } = await supabase
      .from('user_personality_responses')
      .select('question_id')
      .eq('user_id', userId);
    if (answeredErr) throw answeredErr;
    const answeredIds = (answeredQuestions || []).map((q: any) => q.question_id);

    let query = supabase
      .from('personality_questions')
      .select('id, type, text, option_a, option_b, category')
      .eq('is_active', true);

    if (answeredIds.length > 0) {
      const quoted = answeredIds.map((id: string) => `"${id}"`).join(',');
      query = query.not('id', 'in', `(${quoted})`);
    }

    const { data: questions, error: questionsErr } = await query;
    if (questionsErr) throw questionsErr;

    if (!questions || questions.length === 0) {
      res.json({ prompt: null, message: 'All personality questions have been answered' });
      return;
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    if (!lastAnsweredAt) await updatePromptedAt(userId);

    const prompt: PromptResponse = {
      kind: 'personality',
      question: {
        id: question.id,
        type: question.type,
        text: question.text,
        optionA: question.option_a,
        optionB: question.option_b,
        category: question.category,
      },
      totalAnswered: answeredIds.length,
    };
    res.json({ prompt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// POST /api/prompts/submit
router.post('/submit', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const kind = String(req.body?.kind || '').trim();

    if (kind === 'opinion_swipe') {
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
      await updateAnsweredAt(userId);
      res.json({ ok: true });
      return;
    }

    if (kind === 'personality') {
      const questionId = String(req.body?.questionId || '').trim();
      const responseVal = String(req.body?.response || '').trim();
      if (!questionId) {
        res.status(400).json({ error: 'questionId is required' });
        return;
      }
      if (!responseVal) {
        res.status(400).json({ error: 'response is required' });
        return;
      }

      const { data: q, error: qErr } = await supabase
        .from('personality_questions')
        .select('id, type')
        .eq('id', questionId)
        .single();
      if (qErr) throw qErr;

      const type = String((q as any)?.type || '');
      let response_value = null as number | null;
      if (type === 'likert') {
        const map: Record<string, number> = {
          strongly_disagree: 1,
          disagree: 2,
          neutral: 3,
          agree: 4,
          strongly_agree: 5,
        };
        response_value = map[responseVal] ?? null;
        if (!response_value) {
          res.status(400).json({ error: 'Invalid likert response' });
          return;
        }
      } else if (type === 'binary') {
        if (responseVal !== 'a' && responseVal !== 'b') {
          res.status(400).json({ error: 'Invalid binary response' });
          return;
        }
        response_value = responseVal === 'a' ? 1 : 2;
      } else {
        res.status(400).json({ error: 'Invalid question type' });
        return;
      }

      const { error: insErr } = await supabase.from('user_personality_responses').insert({
        user_id: userId,
        question_id: questionId,
        response: responseVal,
        response_value,
      });
      if (insErr && !String(insErr.message || '').toLowerCase().includes('duplicate')) throw insErr;

      await updateAnsweredAt(userId);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Invalid kind' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

export default router;


