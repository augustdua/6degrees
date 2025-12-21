import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

function isValidIanaTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    // Throws RangeError for invalid timeZone
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getLocalDateISO(timeZone: string, date: Date): string {
  // Stable YYYY-MM-DD without bringing in a dependency.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  if (!year || !month || !day) {
    // Fallback (shouldn't happen in modern runtimes)
    const fallback = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
    return fallback;
  }

  return `${year}-${month}-${day}`;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  // Deterministic Fisher–Yates using a small PRNG so we can reproduce when needed.
  // Seed comes from (userId hash + date) in service below.
  const a = [...arr];
  let x = seed >>> 0;
  const rand = () => {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashStringToSeed(s: string): number {
  // Simple non-crypto hash to stable 32-bit int
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function ensureAssignedQuestion(params: {
  userId: string;
  localDate: string;
  version: number;
}): Promise<{ id: string; text: string }> {
  const { userId, localDate, version } = params;

  // Load state if present
  const { data: state, error: stateErr } = await supabase
    .from('user_life_question_state')
    .select('user_id, version, remaining_question_ids, assigned_local_date, assigned_question_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (stateErr) throw stateErr;

  // If already assigned for today, return that question
  if (state?.assigned_local_date === localDate && state?.assigned_question_id) {
    const { data: q, error: qErr } = await supabase
      .from('life_questions')
      .select('id, text')
      .eq('id', state.assigned_question_id)
      .single();
    if (qErr) throw qErr;
    return { id: q.id, text: q.text };
  }

  const remainingRaw = state?.remaining_question_ids;
  const remaining: string[] = Array.isArray(remainingRaw)
    ? (remainingRaw as any)
    : (remainingRaw && typeof remainingRaw === 'object' ? (remainingRaw as any[]) : []);

  let nextRemaining = remaining;

  if (!nextRemaining.length || (state?.version && state.version !== version)) {
    // Refill from DB for this version
    const { data: allQs, error: allErr } = await supabase
      .from('life_questions')
      .select('id')
      .eq('version', version);
    if (allErr) throw allErr;

    const ids = (allQs || []).map(r => r.id);
    if (!ids.length) {
      throw new Error('Life question bank is empty (life_questions). Seed v1 questions first.');
    }

    // Deterministic per-user shuffle seed so order is stable (helps debugging)
    const seed = hashStringToSeed(`${userId}:${version}`);
    nextRemaining = shuffle(ids, seed);
  }

  const assignedId = nextRemaining[0];

  const { data: q, error: qErr } = await supabase
    .from('life_questions')
    .select('id, text')
    .eq('id', assignedId)
    .single();
  if (qErr) throw qErr;

  const upsertRow = {
    user_id: userId,
    version,
    // IMPORTANT: do not consume the question on assignment; consume on submit.
    remaining_question_ids: nextRemaining,
    assigned_local_date: localDate,
    assigned_question_id: assignedId
  };

  const { error: upsertErr } = await supabase
    .from('user_life_question_state')
    .upsert(upsertRow, { onConflict: 'user_id' });
  if (upsertErr) throw upsertErr;

  return { id: q.id, text: q.text };
}

/**
 * GET /api/daily-standup/status?timezone=America/Los_Angeles
 * Returns whether user has completed today's standup (as defined by user's local date).
 * If incomplete, also returns the assigned life question for today.
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const timezone = req.query.timezone;

    if (!isValidIanaTimeZone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone (IANA) is required' });
      return;
    }

    const localDate = getLocalDateISO(timezone, new Date());

    const { data: existing, error: existingErr } = await supabase
      .from('daily_standups')
      .select('id')
      .eq('user_id', userId)
      .eq('local_date', localDate)
      .maybeSingle();
    if (existingErr) throw existingErr;

    if (existing?.id) {
      res.json({
        completedToday: true,
        localDate,
        timezone
      });
      return;
    }

    const assignedQuestion = await ensureAssignedQuestion({
      userId,
      localDate,
      version: 1
    });

    res.json({
      completedToday: false,
      localDate,
      timezone,
      assignedQuestion
    });
  } catch (error: any) {
    console.error('Error in GET /api/daily-standup/status:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/daily-standup/submit
 * Body:
 * {
 *   timezone: string,
 *   yesterday: string,
 *   today: string,
 *   questionId: string,
 *   answer: string
 * }
 */
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { timezone, yesterday, today, questionId, answer } = req.body || {};

    if (!isValidIanaTimeZone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone (IANA) is required' });
      return;
    }

    if (typeof yesterday !== 'string' || yesterday.trim().length < 2) {
      res.status(400).json({ error: 'yesterday is required' });
      return;
    }
    if (typeof today !== 'string' || today.trim().length < 2) {
      res.status(400).json({ error: 'today is required' });
      return;
    }
    if (typeof answer !== 'string' || answer.trim().length < 1) {
      res.status(400).json({ error: 'answer is required' });
      return;
    }
    if (typeof questionId !== 'string' || !questionId.trim()) {
      res.status(400).json({ error: 'questionId is required' });
      return;
    }

    const localDate = getLocalDateISO(timezone, new Date());

    // Ensure assigned question for today and verify client is answering that question
    const assigned = await ensureAssignedQuestion({
      userId,
      localDate,
      version: 1
    });

    if (assigned.id !== questionId) {
      res.status(409).json({
        error: 'Question mismatch for today. Please refresh and answer the assigned question.',
        assignedQuestion: assigned
      });
      return;
    }

    // Snapshot question text for audit/versioning
    const questionText = assigned.text;

    const row = {
      user_id: userId,
      local_date: localDate,
      timezone,
      yesterday: yesterday.trim(),
      today: today.trim(),
      question_id: questionId,
      question_text: questionText,
      answer: answer.trim()
    };

    const { data, error: upsertErr } = await supabase
      .from('daily_standups')
      .upsert(row, { onConflict: 'user_id,local_date' })
      .select('id, user_id, local_date, created_at')
      .single();
    if (upsertErr) throw upsertErr;

    // Consume the assigned question from the remaining list (no repeats until exhausted).
    // We do this after we successfully write the daily standup row.
    const { data: curState, error: curStateErr } = await supabase
      .from('user_life_question_state')
      .select('remaining_question_ids')
      .eq('user_id', userId)
      .maybeSingle();
    if (curStateErr) throw curStateErr;

    const curRemainingRaw = curState?.remaining_question_ids;
    const curRemaining: string[] = Array.isArray(curRemainingRaw)
      ? (curRemainingRaw as any)
      : (curRemainingRaw && typeof curRemainingRaw === 'object' ? (curRemainingRaw as any[]) : []);

    let nextRemaining = curRemaining;
    if (nextRemaining.length) {
      if (nextRemaining[0] === questionId) {
        nextRemaining = nextRemaining.slice(1);
      } else if (nextRemaining.includes(questionId)) {
        nextRemaining = nextRemaining.filter(id => id !== questionId);
      }

      const { error: consumeErr } = await supabase
        .from('user_life_question_state')
        .upsert(
          {
            user_id: userId,
            version: 1,
            remaining_question_ids: nextRemaining,
            assigned_local_date: localDate,
            assigned_question_id: questionId
          },
          { onConflict: 'user_id' }
        );
      if (consumeErr) throw consumeErr;
    }

    res.json({
      success: true,
      completedToday: true,
      localDate,
      id: data.id
    });
  } catch (error: any) {
    console.error('Error in POST /api/daily-standup/submit:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/daily-standup/history?limit=10
 * Returns recent daily standups for the authenticated user (for profile display).
 */
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limitRaw = req.query.limit;
    const limit = Math.max(
      1,
      Math.min(50, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) || 10 : 10)
    );

    const { data, error } = await supabase
      .from('daily_standups')
      .select('id, local_date, timezone, yesterday, today, question_text, answer, created_at')
      .eq('user_id', userId)
      .order('local_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ standups: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/daily-standup/history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;


