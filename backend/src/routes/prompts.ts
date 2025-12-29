import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

const router = Router();
router.use(authenticate);

// Curated Likert question bank (Big Five 50). We keep everything on SD/D/N/A/SA (likert).
const BIG_FIVE_50: Array<{ text: string; category: string; display_order: number }> = [
  // Extraversion (EXT)
  { text: 'I am the life of the party.', category: 'big5_ext', display_order: 1001 },
  { text: "I don't talk a lot.", category: 'big5_ext', display_order: 1002 },
  { text: 'I feel comfortable around people.', category: 'big5_ext', display_order: 1003 },
  { text: 'I keep in the background.', category: 'big5_ext', display_order: 1004 },
  { text: 'I start conversations.', category: 'big5_ext', display_order: 1005 },
  { text: 'I have little to say.', category: 'big5_ext', display_order: 1006 },
  { text: 'I talk to a lot of different people at parties.', category: 'big5_ext', display_order: 1007 },
  { text: "I don't like to draw attention to myself.", category: 'big5_ext', display_order: 1008 },
  { text: "I don't mind being the center of attention.", category: 'big5_ext', display_order: 1009 },
  { text: 'I am quiet around strangers.', category: 'big5_ext', display_order: 1010 },
  // Emotional Stability / Neuroticism (EST)
  { text: 'I get stressed out easily.', category: 'big5_est', display_order: 1011 },
  { text: 'I am relaxed most of the time.', category: 'big5_est', display_order: 1012 },
  { text: 'I worry about things.', category: 'big5_est', display_order: 1013 },
  { text: 'I seldom feel blue.', category: 'big5_est', display_order: 1014 },
  { text: 'I am easily disturbed.', category: 'big5_est', display_order: 1015 },
  { text: 'I get upset easily.', category: 'big5_est', display_order: 1016 },
  { text: 'I change my mood a lot.', category: 'big5_est', display_order: 1017 },
  { text: 'I have frequent mood swings.', category: 'big5_est', display_order: 1018 },
  { text: 'I get irritated easily.', category: 'big5_est', display_order: 1019 },
  { text: 'I often feel blue.', category: 'big5_est', display_order: 1020 },
  // Agreeableness (AGR)
  { text: 'I feel little concern for others.', category: 'big5_agr', display_order: 1021 },
  { text: 'I am interested in people.', category: 'big5_agr', display_order: 1022 },
  { text: 'I insult people.', category: 'big5_agr', display_order: 1023 },
  { text: "I sympathize with others' feelings.", category: 'big5_agr', display_order: 1024 },
  { text: "I am not interested in other people's problems.", category: 'big5_agr', display_order: 1025 },
  { text: 'I have a soft heart.', category: 'big5_agr', display_order: 1026 },
  { text: "I am not really interested in others.", category: 'big5_agr', display_order: 1027 },
  { text: 'I take time out for others.', category: 'big5_agr', display_order: 1028 },
  { text: "I feel others' emotions.", category: 'big5_agr', display_order: 1029 },
  { text: 'I make people feel at ease.', category: 'big5_agr', display_order: 1030 },
  // Conscientiousness (CSN)
  { text: 'I am always prepared.', category: 'big5_csn', display_order: 1031 },
  { text: 'I leave my belongings around.', category: 'big5_csn', display_order: 1032 },
  { text: 'I pay attention to details.', category: 'big5_csn', display_order: 1033 },
  { text: 'I make a mess of things.', category: 'big5_csn', display_order: 1034 },
  { text: 'I get chores done right away.', category: 'big5_csn', display_order: 1035 },
  { text: 'I often forget to put things back in their proper place.', category: 'big5_csn', display_order: 1036 },
  { text: 'I like order.', category: 'big5_csn', display_order: 1037 },
  { text: 'I shirk my duties.', category: 'big5_csn', display_order: 1038 },
  { text: 'I follow a schedule.', category: 'big5_csn', display_order: 1039 },
  { text: 'I am exacting in my work.', category: 'big5_csn', display_order: 1040 },
  // Openness (OPN)
  { text: 'I have a rich vocabulary.', category: 'big5_opn', display_order: 1041 },
  { text: 'I have difficulty understanding abstract ideas.', category: 'big5_opn', display_order: 1042 },
  { text: 'I have a vivid imagination.', category: 'big5_opn', display_order: 1043 },
  { text: 'I am not interested in abstract ideas.', category: 'big5_opn', display_order: 1044 },
  { text: 'I have excellent ideas.', category: 'big5_opn', display_order: 1045 },
  { text: 'I do not have a good imagination.', category: 'big5_opn', display_order: 1046 },
  { text: 'I am quick to understand things.', category: 'big5_opn', display_order: 1047 },
  { text: 'I use difficult words.', category: 'big5_opn', display_order: 1048 },
  { text: 'I spend time reflecting on things.', category: 'big5_opn', display_order: 1049 },
  { text: 'I am full of ideas.', category: 'big5_opn', display_order: 1050 },
];

async function ensureBigFiveSeeded(): Promise<void> {
  // Idempotent: text is UNIQUE. Use upsert so we can ship the bank in code.
  try {
    await supabase
      .from('personality_questions')
      .upsert(
        BIG_FIVE_50.map((q) => ({
          type: 'likert',
          text: q.text,
          category: q.category,
          is_active: true,
          display_order: q.display_order,
        })),
        { onConflict: 'text' }
      );
  } catch {
    // best-effort; don't block prompt serving if schema isn't ready in some env
  }
}

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
    };

type PromptNextResponse =
  | { assignmentId: string; prompt: PromptResponse }
  | { assignmentId: null; prompt: null; cooldown?: boolean; cooldownUntil?: string; message?: string };

async function updatePromptedAt(userId: string): Promise<void> {
  // Used only for the very first prompt (before the user has ever answered).
  await supabase.from('users').update({ personality_last_prompted_at: new Date().toISOString() }).eq('id', userId);
}

async function updateAnsweredAt(userId: string): Promise<void> {
  await supabase.from('users').update({ prompt_last_answered_at: new Date().toISOString() }).eq('id', userId);
}

async function getActiveAssignment(userId: string): Promise<{ id: string; prompt_payload: any; expires_at: string } | null> {
  const { data, error } = await supabase
    .from('prompt_assignments')
    .select('id, prompt_payload, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as any;
}

async function expireAssignment(assignmentId: string): Promise<void> {
  await supabase
    .from('prompt_assignments')
    .update({ status: 'expired', expired_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('status', 'active');
}

async function markShown(assignmentId: string): Promise<void> {
  // Best-effort, don't block responses.
  await supabase
    .from('prompt_assignments')
    .update({ shown_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('status', 'active')
    .is('shown_at', null);
}

async function createAssignment(userId: string, prompt: PromptResponse): Promise<{ id: string; prompt: PromptResponse }> {
  const prompt_ref_id = String(prompt.question.id);

  const { data, error } = await supabase
    .from('prompt_assignments')
    .insert({
      user_id: userId,
      prompt_kind: prompt.kind,
      prompt_ref_id,
      prompt_payload: prompt,
      status: 'active',
      // expires_at default is 24h
    })
    .select('id')
    .single();

  if (error) throw error;
  const id = (data as any).id as string;
  // Fire-and-forget shown mark (not strictly "shown", but "served"; still useful)
  void markShown(id);
  return { id, prompt };
}

// GET /api/prompts/next
router.get('/next', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // If there's an active assignment, return it until answered/dismissed/expired (idempotent retry).
    // This is the SOTA "lease": the backend is the source of truth for unanswered prompts.
    try {
      const active = await getActiveAssignment(userId);
      if (active) {
        const expiresAt = new Date(active.expires_at).getTime();
        if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
          await expireAssignment(active.id);
        } else {
          const prompt = (active.prompt_payload || null) as PromptResponse | null;
          // If legacy opinion_swipe assignment exists, expire it and fall through to personality.
          if ((prompt as any)?.kind === 'opinion_swipe') {
            await expireAssignment(active.id);
          } else if (prompt) {
            res.json({ assignmentId: active.id, prompt } satisfies PromptNextResponse);
            return;
          }
        }
      }
    } catch {
      // If prompt_assignments isn't yet migrated in an environment, fall back to legacy behavior.
    }

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
        res.json({ assignmentId: null, prompt: null, cooldown: true, cooldownUntil: new Date(last + cooldownMs).toISOString() } satisfies PromptNextResponse);
        return;
      }
    }

    // Personality: pick random unanswered question (same logic as /api/personality/next-question)
    await ensureBigFiveSeeded();
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
      res.json({ assignmentId: null, prompt: null, message: 'All personality questions have been answered' } satisfies PromptNextResponse);
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
    try {
      const created = await createAssignment(userId, prompt);
      res.json({ assignmentId: created.id, prompt: created.prompt } satisfies PromptNextResponse);
    } catch {
      res.json({ assignmentId: null, prompt });
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// POST /api/prompts/submit
router.post('/submit', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const kind = String(req.body?.kind || '').trim();
    const assignmentId = String(req.body?.assignmentId || '').trim();

    // If assignments exist, require assignmentId so answers map to a specific served prompt.
    // If the table isn't migrated somewhere, we fall back to legacy behavior.
    let assignment: any | null = null;
    if (assignmentId) {
      try {
        const { data, error } = await supabase
          .from('prompt_assignments')
          .select('id, user_id, status, prompt_kind, prompt_payload')
          .eq('id', assignmentId)
          .single();
        if (error) throw error;
        assignment = data;
        if (!assignment || assignment.user_id !== userId) {
          res.status(403).json({ error: 'Invalid assignment' });
          return;
        }
        if (assignment.status !== 'active') {
          res.status(409).json({ error: 'Assignment is not active' });
          return;
        }
      } catch {
        assignment = null;
      }
    }

    if (kind === 'opinion_swipe') {
      // Deprecated: we no longer serve Reddit-based opinion swipes.
      // Accept old client submissions and mark assignment answered (best-effort), but don't record new swipe data.
      await updateAnsweredAt(userId);
      if (assignment?.id) {
        await supabase
          .from('prompt_assignments')
          .update({
            status: 'answered',
            answered_at: new Date().toISOString(),
            answer_payload: { kind, deprecated: true },
          })
          .eq('id', assignment.id)
          .eq('status', 'active');
      }
      res.json({ ok: true, deprecated: true });
      return;
    }

    if (kind === 'personality') {
      const questionId =
        assignment?.prompt_payload?.kind === 'personality'
          ? String(assignment.prompt_payload?.question?.id || '').trim()
          : String(req.body?.questionId || '').trim();
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
      if (assignment?.id) {
        await supabase
          .from('prompt_assignments')
          .update({
            status: 'answered',
            answered_at: new Date().toISOString(),
            answer_payload: { kind, response: responseVal },
          })
          .eq('id', assignment.id)
          .eq('status', 'active');
      }
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Invalid kind' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

export default router;


