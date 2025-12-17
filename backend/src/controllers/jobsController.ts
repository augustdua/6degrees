import { Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import { generateMarketResearchReport } from '../services/marketResearchService';
import { generateMarketGapsReport } from '../services/marketGapsService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchDailyIdeaNews } from '../services/newsService';

function slugKey(input: string): string {
  const s = (input || '').trim().toLowerCase();
  const compact = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (compact && compact.length >= 6) return compact.slice(0, 64);
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function requireCronSecret(req: AuthenticatedRequest): string | null {
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) return null;
  const provided = String(req.header('x-cron-secret') || req.query?.cron_secret || '').trim();
  if (!provided || provided !== expected) return null;
  return expected;
}

async function getCommunityIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from('forum_communities').select('id').eq('slug', slug).single();
  return data?.id || null;
}

async function postExistsByTag(communityId: string, tag: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('community_id', communityId)
    .contains('tags', [tag])
    .eq('is_deleted', false)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

function yyyyMmDdUTC(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function safeJsonParse(text: string): any {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```json/i, '```')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

async function getSystemUserId(): Promise<string> {
  const systemUserId = (process.env.SYSTEM_USER_ID || '').trim();
  if (!systemUserId) throw new Error('SYSTEM_USER_ID missing');
  return systemUserId;
}

async function publishMarketResearchOnce(params: {
  topic: string;
  topicKey: string;
  dayTag: string;
}): Promise<{ published: boolean; post_id?: string; run_id?: string }> {
  const communityId = await getCommunityIdBySlug('market-research');
  if (!communityId) throw new Error('market-research community not found');

  const alreadyRanToday = await postExistsByTag(communityId, params.dayTag);
  if (alreadyRanToday) return { published: false };

  const systemUserId = await getSystemUserId();
  const topicTag = `mr:topic:${params.topicKey}`;

  const out = await generateMarketResearchReport({ topic: params.topic, debug: true });

  const { data: post, error: postErr } = await supabase
    .from('forum_posts')
    .insert({
      community_id: communityId,
      user_id: systemUserId,
      content: out.preview,
      body: out.markdown,
      post_type: 'research_report',
      tags: [params.dayTag, topicTag, 'auto'],
    })
    .select('id')
    .single();

  if (postErr) throw new Error(`failed_to_publish: ${String(postErr.message || postErr)}`);
  return { published: true, post_id: post.id, run_id: out.artifacts?.run_id };
}

async function publishMarketGapsOnce(params: {
  category: string;
  categoryKey: string;
  brands: string[];
  countryContext: string;
  dayTag: string;
}): Promise<{ published: boolean; post_id?: string; run_id?: string; skipped_reason?: string }> {
  const communityId = await getCommunityIdBySlug('market-gaps');
  if (!communityId) throw new Error('market-gaps community not found');

  const alreadyRanToday = await postExistsByTag(communityId, params.dayTag);
  if (alreadyRanToday) return { published: false };

  if (!Array.isArray(params.brands) || params.brands.length === 0) {
    return { published: false, skipped_reason: 'missing_brand_set' };
  }

  const systemUserId = await getSystemUserId();
  const categoryTag = `mg:category:${params.categoryKey}`;

  const out = await generateMarketGapsReport({
    category: params.category,
    brands: params.brands,
    countryContext: params.countryContext,
    timeHorizon: '12-24 months',
    debug: true,
  });

  const { data: post, error: postErr } = await supabase
    .from('forum_posts')
    .insert({
      community_id: communityId,
      user_id: systemUserId,
      content: out.preview,
      body: out.markdown,
      post_type: 'market-gap',
      tags: [params.dayTag, categoryTag, 'auto'],
    })
    .select('id')
    .single();

  if (postErr) throw new Error(`failed_to_publish: ${String(postErr.message || postErr)}`);
  return { published: true, post_id: post.id, run_id: out.artifacts?.run_id };
}

/**
 * POST /api/jobs/daily
 * Full automation: pick ideas from RSS -> upsert topic/category lists -> publish 1 MR + 1 MG report (idempotent per day).
 */
export const runDailyIdeasAndReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
      return;
    }
    // NOTE: gemini-3-pro has been deprecated/removed from the API; default to a stable model.
    const modelName = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

    const limit = Math.max(10, Math.min(60, Number(req.body?.limit ?? 40) || 40));
    const countryContext = String(req.body?.country_context || 'India').trim() || 'India';
    const priority = Number(req.body?.priority ?? 90) || 90; // auto ideas should float to top
    const dryRun = String(req.body?.dry_run || '').toLowerCase() === 'true';

    const news = await fetchDailyIdeaNews();
    const items = news.slice(0, limit).map((x: any) => ({
      title: x.title,
      url: x.link,
      date: x.pubDate,
      source: x.author || 'News',
      excerpt: x.description,
    }));

    const prompt = `
You are an "Idea Selector" for a startup intelligence forum.

Input: a list of news items (title, url, date, excerpt). Use ONLY these items as evidence.

Task: pick EXACTLY:
1) ONE Market Research topic: "where money is moving" (funding, new business models, distribution, infra, regulation).
2) ONE Market Gap category: a mature category where new segments/gaps are emerging.
   IMPORTANT: also propose a brand_set (5-8 relevant Indian brands/players) so we can run the pipeline.

Output JSON ONLY with this schema:
{
  "market_research": {
    "topic": "string",
    "why_now": ["bullet", "bullet", "bullet"],
    "signals": [{"title":"", "url":"", "source":"Inc42|Entrackr", "date":""}],
    "keywords": ["..."]
  },
  "market_gaps": {
    "category": "string",
    "hypothesis": "string",
    "segments": ["..."],
    "brand_set": ["Brand 1", "Brand 2", "Brand 3"],
    "why_now": ["..."],
    "signals": [{"title":"", "url":"", "source":"Inc42|Entrackr", "date":""}],
    "keywords": ["..."]
  }
}

Rules:
- Signals MUST reference URLs from the provided input. Do not invent links.
- Prefer India-relevant topics.
- Avoid generic topics like "AI is booming"; make it specific (industry + wedge + why now).
- Market gap category should be phrased like: "<category> in ${countryContext} — <new segment or unmet need>".
- brand_set should be plausible and India-relevant; include both incumbents and fast-growing challengers where possible.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const resp = await model.generateContent(`${prompt}\n\nNews Items:\n${JSON.stringify(items, null, 2)}`, {
      generationConfig: { temperature: 0.4 },
    } as any);
    const text = resp?.response?.text?.() ?? '';
    const ideas = safeJsonParse(text);

    if (!ideas) {
      res.status(500).json({ error: 'Agent did not return JSON', raw: text });
      return;
    }

    const topic = String(ideas?.market_research?.topic || '').trim();
    const category = String(ideas?.market_gaps?.category || '').trim();
    const brand_set_raw = ideas?.market_gaps?.brand_set;
    const brand_set: string[] = Array.isArray(brand_set_raw)
      ? brand_set_raw.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 10)
      : [];

    if (!topic || !category) {
      res.status(500).json({ error: 'Agent output missing topic/category', ideas });
      return;
    }

    const topicKey = slugKey(topic);
    const categoryKey = slugKey(category);

    // Upsert lists (no-op if already exists)
    await supabase.from('market_research_topics').upsert(
      {
        topic,
        topic_key: topicKey,
        active: true,
        priority,
        cadence: 'daily',
      } as any,
      { onConflict: 'topic_key' } as any
    );

    await supabase.from('market_gap_categories').upsert(
      {
        category,
        category_key: categoryKey,
        brand_set: brand_set,
        country_context: countryContext,
        active: true,
        priority,
        cadence: 'daily',
      } as any,
      { onConflict: 'category_key' } as any
    );

    const day = yyyyMmDdUTC(new Date());
    const mrDayTag = `mr:day:${day}`;
    const mgDayTag = `mg:day:${day}`;

    if (dryRun) {
      res.status(200).json({
        ok: true,
        dry_run: true,
        day,
        input_count: items.length,
        topic,
        topic_key: topicKey,
        category,
        category_key: categoryKey,
        brand_set,
        ideas,
      });
      return;
    }

    const mr = await publishMarketResearchOnce({ topic, topicKey, dayTag: mrDayTag });
    const mg = await publishMarketGapsOnce({
      category,
      categoryKey,
      brands: brand_set,
      countryContext,
      dayTag: mgDayTag,
    });

    // Mark generated_at on the rows we used (best effort)
    if (mr.published) {
      await supabase.from('market_research_topics').update({ last_generated_at: new Date().toISOString() }).eq('topic_key', topicKey);
    }
    if (mg.published) {
      await supabase.from('market_gap_categories').update({ last_generated_at: new Date().toISOString() }).eq('category_key', categoryKey);
    }

    res.status(200).json({
      ok: true,
      day,
      input_count: items.length,
      topic,
      topic_key: topicKey,
      market_research: mr,
      category,
      category_key: categoryKey,
      brand_set,
      market_gaps: mg,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};

export const runDailyMarketResearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const communityId = await getCommunityIdBySlug('market-research');
    if (!communityId) {
      res.status(500).json({ error: 'market-research community not found' });
      return;
    }

    const systemUserId = (process.env.SYSTEM_USER_ID || '').trim();
    if (!systemUserId) {
      res.status(500).json({ error: 'SYSTEM_USER_ID missing' });
      return;
    }

    const { data: topics, error } = await supabase
      .from('market_research_topics')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(topics) || topics.length === 0) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no_active_topics' });
      return;
    }

    // Idempotency: allow cron retries but only publish 1 per day.
    const dayTag = `mr:day:${yyyyMmDdUTC(new Date())}`;
    const alreadyRanToday = await postExistsByTag(communityId, dayTag);
    if (alreadyRanToday) {
      res.status(200).json({ ok: true, skipped: true, reason: 'already_ran_today', day: dayTag });
      return;
    }

    // Pick oldest last_generated_at first (nulls first).
    const sorted = [...topics].sort((a: any, b: any) => {
      const at = a.last_generated_at ? new Date(a.last_generated_at).getTime() : -1;
      const bt = b.last_generated_at ? new Date(b.last_generated_at).getTime() : -1;
      return at - bt;
    });

    for (const row of sorted.slice(0, 10)) {
      const topic = String(row.topic || '').trim();
      if (!topic) continue;
      const topicKey = String(row.topic_key || '').trim() || slugKey(topic);
      const topicTag = `mr:topic:${topicKey}`;

      const out = await generateMarketResearchReport({ topic, debug: true });

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.preview,
          body: out.markdown,
          post_type: 'research_report',
          tags: [dayTag, topicTag, 'auto'],
        })
        .select('id')
        .single();

      if (postErr) {
        res.status(500).json({ error: 'failed_to_publish', details: String(postErr.message || postErr) });
        return;
      }

      await supabase
        .from('market_research_topics')
        .update({ topic_key: topicKey, last_generated_at: new Date().toISOString() })
        .eq('id', row.id);

      res.status(200).json({ ok: true, topic, topic_key: topicKey, post_id: post.id, run: out.artifacts?.run_id, day: dayTag });
      return;
    }

    res.status(200).json({ ok: true, skipped: true, reason: 'all_recent_or_existing' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};

export const runDailyMarketGaps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const communityId = await getCommunityIdBySlug('market-gaps');
    if (!communityId) {
      res.status(500).json({ error: 'market-gaps community not found' });
      return;
    }

    const systemUserId = (process.env.SYSTEM_USER_ID || '').trim();
    if (!systemUserId) {
      res.status(500).json({ error: 'SYSTEM_USER_ID missing' });
      return;
    }

    const { data: cats, error } = await supabase
      .from('market_gap_categories')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(cats) || cats.length === 0) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no_active_categories' });
      return;
    }

    // Idempotency: allow cron retries but only publish 1 per day.
    const dayTag = `mg:day:${yyyyMmDdUTC(new Date())}`;
    const alreadyRanToday = await postExistsByTag(communityId, dayTag);
    if (alreadyRanToday) {
      res.status(200).json({ ok: true, skipped: true, reason: 'already_ran_today', day: dayTag });
      return;
    }

    const sorted = [...cats].sort((a: any, b: any) => {
      const at = a.last_generated_at ? new Date(a.last_generated_at).getTime() : -1;
      const bt = b.last_generated_at ? new Date(b.last_generated_at).getTime() : -1;
      return at - bt;
    });

    for (const row of sorted.slice(0, 10)) {
      const category = String(row.category || '').trim();
      if (!category) continue;
      const categoryKey = String(row.category_key || '').trim() || slugKey(category);
      const categoryTag = `mg:category:${categoryKey}`;

      const brands: string[] = Array.isArray(row.brand_set) ? row.brand_set.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      if (brands.length === 0) continue;

      const out = await generateMarketGapsReport({
        category,
        brands,
        countryContext: row.country_context || 'India',
        timeHorizon: '12-24 months',
        debug: true,
      });

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.preview,
          body: out.markdown,
          post_type: 'market-gap',
          tags: [dayTag, categoryTag, 'auto'],
        })
        .select('id')
        .single();

      if (postErr) {
        res.status(500).json({ error: 'failed_to_publish', details: String(postErr.message || postErr) });
        return;
      }

      await supabase
        .from('market_gap_categories')
        .update({ category_key: categoryKey, last_generated_at: new Date().toISOString() })
        .eq('id', row.id);

      res.status(200).json({ ok: true, category, category_key: categoryKey, post_id: post.id, run: out.artifacts?.run_id, day: dayTag });
      return;
    }

    res.status(200).json({ ok: true, skipped: true, reason: 'all_recent_or_existing' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};



