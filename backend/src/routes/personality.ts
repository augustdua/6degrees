import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/personality/next-question
 * Returns the next unanswered personality question for the user.
 * Returns null if all questions have been answered.
 */
router.get('/next-question', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Enforce cooldown:
    // - After the user has answered at least once: based on users.prompt_last_answered_at
    // - Before the first-ever answer: fall back to users.personality_last_prompted_at
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
      const cooldownMs = 10 * 60 * 1000; // 10 minutes
      if (now - last < cooldownMs) {
        const cooldownUntil = new Date(last + cooldownMs).toISOString();
        res.json({
          question: null,
          cooldown: true,
          cooldownUntil,
          message: 'Cooldown active (once per 10 minutes)'
        });
        return;
      }
    }

    // Get all answered question IDs for this user
    const { data: answeredQuestions, error: answeredErr } = await supabase
      .from('user_personality_responses')
      .select('question_id')
      .eq('user_id', userId);

    if (answeredErr) throw answeredErr;

    const answeredIds = (answeredQuestions || []).map(q => q.question_id);

    // Get a random unanswered question
    let query = supabase
      .from('personality_questions')
      .select('id, type, text, option_a, option_b, category')
      .eq('is_active', true);

    // Exclude already answered questions
    if (answeredIds.length > 0) {
      // UUIDs must be quoted in PostgREST "in" filters
      const quoted = answeredIds.map((id) => `"${id}"`).join(',');
      query = query.not('id', 'in', `(${quoted})`);
    }

    const { data: questions, error: questionsErr } = await query;

    if (questionsErr) throw questionsErr;

    if (!questions || questions.length === 0) {
      // All questions answered
      res.json({
        question: null,
        totalAnswered: answeredIds.length,
        message: 'All personality questions have been answered'
      });
      return;
    }

    // Pick a random question from remaining
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    // Mark prompted time only before the first-ever answer.
    if (!lastAnsweredAt) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ personality_last_prompted_at: new Date().toISOString() })
        .eq('id', userId);
      if (updateErr) throw updateErr;
    }

    res.json({
      question: {
        id: question.id,
        type: question.type,
        text: question.text,
        optionA: question.option_a,
        optionB: question.option_b,
        category: question.category
      },
      totalAnswered: answeredIds.length,
      totalRemaining: questions.length
    });
  } catch (error: any) {
    console.error('Error in GET /api/personality/next-question:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/personality/submit
 * Submit an answer to a personality question
 * Body:
 * {
 *   questionId: string,
 *   response: string, // For likert: 'strongly_disagree' | 'disagree' | 'neutral' | 'agree' | 'strongly_agree'
 *                     // For binary: 'a' | 'b'
 * }
 */
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { questionId, response } = req.body || {};

    if (!questionId || typeof questionId !== 'string') {
      res.status(400).json({ error: 'questionId is required' });
      return;
    }

    if (!response || typeof response !== 'string') {
      res.status(400).json({ error: 'response is required' });
      return;
    }

    // Validate the question exists and get its type
    const { data: question, error: questionErr } = await supabase
      .from('personality_questions')
      .select('id, type')
      .eq('id', questionId)
      .single();

    if (questionErr || !question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Validate response based on question type
    let responseValue: number;
    const responseLower = response.toLowerCase();

    if (question.type === 'likert') {
      const likertMapping: Record<string, number> = {
        'strongly_disagree': 1,
        'disagree': 2,
        'neutral': 3,
        'agree': 4,
        'strongly_agree': 5
      };

      if (!likertMapping[responseLower]) {
        res.status(400).json({
          error: 'Invalid response for likert question. Must be: strongly_disagree, disagree, neutral, agree, or strongly_agree'
        });
        return;
      }
      responseValue = likertMapping[responseLower];
    } else if (question.type === 'binary') {
      if (responseLower !== 'a' && responseLower !== 'b') {
        res.status(400).json({
          error: 'Invalid response for binary question. Must be: a or b'
        });
        return;
      }
      responseValue = responseLower === 'a' ? 1 : 2;
    } else {
      res.status(400).json({ error: 'Unknown question type' });
      return;
    }

    // Upsert the response (allows changing answer)
    const { data, error: upsertErr } = await supabase
      .from('user_personality_responses')
      .upsert(
        {
          user_id: userId,
          question_id: questionId,
          response: responseLower,
          response_value: responseValue
        },
        { onConflict: 'user_id,question_id' }
      )
      .select('id, created_at')
      .single();

    if (upsertErr) throw upsertErr;

    // Cooldown should be answer-based (after the first prompt).
    await supabase
      .from('users')
      .update({ prompt_last_answered_at: new Date().toISOString() })
      .eq('id', userId);

    res.json({
      success: true,
      responseId: data.id,
      questionId,
      response: responseLower,
      responseValue
    });
  } catch (error: any) {
    console.error('Error in POST /api/personality/submit:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/personality/history
 * Returns all personality responses for the authenticated user
 */
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('user_personality_responses')
      .select(`
        id,
        response,
        response_value,
        created_at,
        personality_questions (
          id,
          type,
          text,
          option_a,
          option_b,
          category
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      responses: (data || []).map(r => ({
        id: r.id,
        response: r.response,
        responseValue: r.response_value,
        createdAt: r.created_at,
        question: r.personality_questions
      }))
    });
  } catch (error: any) {
    console.error('Error in GET /api/personality/history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/personality/stats
 * Returns statistics about the user's personality responses
 */
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get counts
    const { data: responses, error: responsesErr } = await supabase
      .from('user_personality_responses')
      .select('id, response_value')
      .eq('user_id', userId);

    if (responsesErr) throw responsesErr;

    const { data: totalQuestions, error: totalErr } = await supabase
      .from('personality_questions')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    if (totalErr) throw totalErr;

    const answered = responses?.length || 0;
    const total = totalQuestions?.length || 0;

    // Calculate average likert score (1-5)
    const likertResponses = (responses || []).filter(r => r.response_value >= 1 && r.response_value <= 5);
    const avgLikert = likertResponses.length > 0
      ? likertResponses.reduce((sum, r) => sum + r.response_value, 0) / likertResponses.length
      : null;

    res.json({
      answered,
      total,
      remaining: total - answered,
      completionPercentage: total > 0 ? Math.round((answered / total) * 100) : 0,
      averageLikertScore: avgLikert ? Math.round(avgLikert * 100) / 100 : null
    });
  } catch (error: any) {
    console.error('Error in GET /api/personality/stats:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;

