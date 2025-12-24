import OpenAI from 'openai';
import { supabase } from '../config/supabase';
import { fetchRedditTopPosts } from './redditService';

type OpinionCardRow = {
  id: string;
  generated_statement: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function isSchemaCacheMissingTableError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return msg.includes("Could not find the table 'public.") && msg.includes('in the schema cache');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function generateOpinionStatement(input: {
  title: string;
  body?: string | null;
}): Promise<string> {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();

  // Fallback if OpenAI key missing
  if (!openai) {
    return title ? `I agree that ${title.replace(/[.?!]+$/, '')}.` : 'I agree with this.';
  }

  const prompt = `You are generating a single, punchy opinion statement for a swipe card.

Context: This is based on a Reddit post from r/india.
Source title: ${title}
Source body (may be empty): ${body.slice(0, 800)}

Requirements:
- Output EXACTLY one sentence.
- It must be a clear opinion that a user can swipe Agree/Disagree on.
- Do NOT mention Reddit or r/india.
- Do NOT include quotes or attribution.
- Keep it under 20 words.
- No emojis.

Return JSON only:
{"statement":"..."}\n`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 80,
    response_format: { type: 'json_object' },
  });

  const text = completion.choices[0]?.message?.content || '';
  const parsed = JSON.parse(text);
  const statement = String(parsed?.statement || '').trim();
  if (!statement) throw new Error('OpenAI returned empty statement');
  return statement.slice(0, 220);
}

export async function ensureOpinionPool(minPoolSize = 30): Promise<{ ok: boolean; created: number; total: number }> {
  const min = clamp(Number(minPoolSize || 0), 5, 200);

  const { count: totalCount, error: countErr } = await supabase
    .from('opinion_cards')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'reddit')
    .eq('subreddit', 'india');
  if (countErr) throw countErr;

  const total = totalCount || 0;
  if (total >= min) return { ok: true, created: 0, total };

  const toCreate = clamp(min - total, 5, 25);

  // Fetch candidate posts from r/india
  const posts = await fetchRedditTopPosts({ subreddit: 'india', timeframe: 'day', limit: toCreate * 2, cacheMs: 0 });

  let created = 0;
  for (const p of posts) {
    if (created >= toCreate) break;
    const title = String(p.title || '').trim();
    if (!title) continue;

    // Skip if already exists
    const { data: existing } = await supabase
      .from('opinion_cards')
      .select('id')
      .eq('source', 'reddit')
      .eq('external_id', p.id)
      .single();
    if (existing?.id) continue;

    const statement = await generateOpinionStatement({ title, body: p.selftext || null });

    const { error: insErr } = await supabase.from('opinion_cards').insert({
      source: 'reddit',
      subreddit: 'india',
      external_id: p.id,
      external_url: p.url,
      title,
      body: p.selftext || null,
      generated_statement: statement,
    });
    if (insErr) {
      // ignore duplicates/races
      continue;
    }
    created += 1;
  }

  const { count: totalAfter, error: countErr2 } = await supabase
    .from('opinion_cards')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'reddit')
    .eq('subreddit', 'india');
  if (countErr2) throw countErr2;

  return { ok: true, created, total: totalAfter || 0 };
}

export async function getNextOpinionCardForUser(userId: string): Promise<OpinionCardRow | null> {
  // Ensure pool exists (best-effort)
  await ensureOpinionPool(30).catch(() => {});

  // Get a card the user hasn't swiped yet
  let swiped: any[] = [];
  try {
    const { data, error: swipedErr } = await supabase
      .from('user_opinion_swipes')
      .select('opinion_card_id')
      .eq('user_id', userId);
    if (swipedErr) throw swipedErr;
    swiped = Array.isArray(data) ? data : [];
  } catch (e: any) {
    // If PostgREST schema cache is stale, don't 500 prompts; just behave like no swipes yet.
    if (!isSchemaCacheMissingTableError(e)) throw e;
    swiped = [];
  }

  const swipedIds = new Set((swiped || []).map((r: any) => String(r.opinion_card_id)));

  const { data: cards, error } = await supabase
    .from('opinion_cards')
    .select('id, generated_statement')
    .eq('source', 'reddit')
    .eq('subreddit', 'india')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const pick = (cards || []).find((c: any) => !swipedIds.has(String(c.id)));
  if (!pick) return null;
  return { id: String(pick.id), generated_statement: String(pick.generated_statement || '').trim() };
}

export async function recordOpinionSwipe(userId: string, cardId: string, direction: 'left' | 'right'): Promise<void> {
  const dir = direction === 'right' ? 'right' : 'left';
  try {
    const { error } = await supabase.from('user_opinion_swipes').insert({
      user_id: userId,
      opinion_card_id: cardId,
      direction: dir,
    });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error;
  } catch (e: any) {
    if (isSchemaCacheMissingTableError(e)) return; // best-effort; avoids hard failures during cache propagation
    throw e;
  }
}


