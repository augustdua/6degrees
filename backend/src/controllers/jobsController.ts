import { Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import { generateMarketResearchReport } from '../services/marketResearchService';
import { generateMarketGapsReport } from '../services/marketGapsService';
import { generateReportBlocksFromMarkdownWithMeta } from '../services/reportBlocksService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchDailyIdeaNews } from '../services/newsService';
import { recordReportRun } from '../services/reportRunService';

function canonicalizeUrl(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.hash = '';
    // Drop common tracking params
    const dropPrefixes = ['utm_'];
    const dropKeys = new Set(['gclid', 'fbclid', 'igshid', 'mc_cid', 'mc_eid', 'ref', 'ref_src']);
    const toDelete: string[] = [];
    u.searchParams.forEach((_, key) => {
      if (dropKeys.has(key)) toDelete.push(key);
      if (dropPrefixes.some((p) => key.startsWith(p))) toDelete.push(key);
    });
    toDelete.forEach((k) => u.searchParams.delete(k));
    // Normalize trailing slash
    const cleaned = u.toString();
    return cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
  } catch {
    return raw;
  }
}

async function getNewsCommunityIdForJobs(): Promise<string | null> {
  const { data: news } = await supabase.from('forum_communities').select('id').eq('slug', 'news').single();
  if (news?.id) return news.id;
  const { data: general } = await supabase.from('forum_communities').select('id').eq('slug', 'general').single();
  return general?.id || null;
}

async function upsertLatestNewsToDb(): Promise<void> {
  try {
    const [communityId, systemUserId] = await Promise.all([getNewsCommunityIdForJobs(), getSystemUserId()]);
    if (!communityId || !systemUserId) return;
    const articles = await fetchDailyIdeaNews();
    if (!Array.isArray(articles) || articles.length === 0) return;

    // Keep this lightweight: persist top 40 items so the daily jobs can run from DB.
    const rows = articles
      .filter((a: any) => a?.link)
      .slice(0, 40)
      .map((a: any) => {
        const publishedAt = a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString();
        const desc = String(a.description || '').trim();
        const body = desc.length > 0 ? desc : '';
        return {
          community_id: communityId,
          user_id: systemUserId,
          post_type: 'news',
          content: a.title,
          body,
          media_urls: a.imageUrl ? [a.imageUrl] : [],
          tags: ['news'],
          news_url: a.link,
          news_source: a.author || 'News',
          news_published_at: publishedAt,
          news_image_url: a.imageUrl || null,
          created_at: publishedAt,
          updated_at: new Date().toISOString(),
          is_deleted: false,
        };
      });

    await supabase.from('forum_posts').upsert(rows as any, { onConflict: 'news_url' } as any);
  } catch (e) {
    console.warn('upsertLatestNewsToDb failed (best-effort):', (e as any)?.message || e);
  }
}

async function getDedupedNewsForIdeaAgent(params: { limit: number; dedupeWindowDays: number }) {
  const now = Date.now();
  const since = new Date(now - params.dedupeWindowDays * 864e5).toISOString();

  // Pull a generous pool from forum_posts (news posts only)
  const { data: newsRows } = await supabase
    .from('forum_posts')
    .select('news_url, news_source, news_published_at, content, body, created_at')
    .eq('post_type', 'news')
    .eq('is_deleted', false)
    .not('news_url', 'is', null)
    .order('news_published_at', { ascending: false })
    .limit(200);

  // What have we already used recently?
  const { data: usedRows } = await supabase
    .from('daily_idea_run_items')
    .select('canonical_url, created_at')
    .gte('created_at', since)
    .limit(5000);

  const used = new Set<string>((usedRows || []).map((r: any) => String(r?.canonical_url || '')).filter(Boolean));
  const out: Array<{ title: string; url: string; date: string; source: string; excerpt: string; canonical_url: string }> = [];
  const seen = new Set<string>();

  for (const r of newsRows || []) {
    const url = String((r as any).news_url || '').trim();
    if (!url) continue;
    const canon = canonicalizeUrl(url);
    if (!canon) continue;
    if (seen.has(canon)) continue;
    if (used.has(canon)) continue;
    seen.add(canon);

    out.push({
      title: String((r as any).content || '').trim(),
      url,
      date: String((r as any).news_published_at || (r as any).created_at || ''),
      source: String((r as any).news_source || 'News').trim() || 'News',
      excerpt: String((r as any).body || '').trim(),
      canonical_url: canon,
    });
    if (out.length >= params.limit) break;
  }

  return out;
}

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

  const startedAt = new Date().toISOString();
  const out = await generateMarketResearchReport({ topic: params.topic, debug: true });

  // Generate structured report blocks for rich UI rendering
  let reportBlocks = null;
  let reportBlocksMeta: { prompt?: string; raw_output?: string; model_name?: string } | null = null;
  try {
    const rb = await generateReportBlocksFromMarkdownWithMeta({
      markdown: out.markdown,
      fallbackTitle: out.title || params.topic,
    });
    reportBlocks = rb.doc;
    reportBlocksMeta = { prompt: rb.prompt, raw_output: rb.raw_output, model_name: rb.model_name };
  } catch (e) {
    console.error('Failed to generate report blocks:', e);
    // Continue without blocks - markdown fallback will work
  }

  const { data: post, error: postErr } = await supabase
    .from('forum_posts')
    .insert({
      community_id: communityId,
      user_id: systemUserId,
      content: out.title,  // FIXED: Use title, not preview
      body: out.markdown,
      report_blocks: reportBlocks,  // ADDED: Structured blocks for rich rendering
      post_type: 'research_report',
      tags: [params.dayTag, topicTag, 'auto'],
    })
    .select('id')
    .single();

  if (postErr) throw new Error(`failed_to_publish: ${String(postErr.message || postErr)}`);
  // Persist run metadata (best effort)
  await recordReportRun({
    post_id: post.id,
    report_kind: 'market_research',
    run_id: out.artifacts?.run_id ?? null,
    status: 'success',
    model_name: (process.env.GEMINI_MODEL || 'gemini-3-pro-preview').trim(),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    inputs: {
      topic: params.topic,
      topic_key: params.topicKey,
      day_tag: params.dayTag,
    },
    prompts: {
      writer_prompt: out.meta?.writer_prompt,
      report_blocks_prompt: reportBlocksMeta?.prompt,
    },
    outputs: {
      title: out.title,
      sources: out.sources,
      preview: out.preview,
      report_blocks_model: reportBlocksMeta?.model_name,
      report_blocks_raw_output: reportBlocksMeta?.raw_output,
    },
  });
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

  const startedAt = new Date().toISOString();
  const out = await generateMarketGapsReport({
    category: params.category,
    brands: params.brands,
    countryContext: params.countryContext,
    timeHorizon: '12-24 months',
    debug: true,
  });

  // Generate structured report blocks for rich UI rendering
  let reportBlocks = null;
  let reportBlocksMeta: { prompt?: string; raw_output?: string; model_name?: string } | null = null;
  try {
    const rb = await generateReportBlocksFromMarkdownWithMeta({
      markdown: out.markdown,
      fallbackTitle: out.title || params.category,
    });
    reportBlocks = rb.doc;
    reportBlocksMeta = { prompt: rb.prompt, raw_output: rb.raw_output, model_name: rb.model_name };
  } catch (e) {
    console.error('Failed to generate report blocks:', e);
    // Continue without blocks - markdown fallback will work
  }

  const { data: post, error: postErr } = await supabase
    .from('forum_posts')
    .insert({
      community_id: communityId,
      user_id: systemUserId,
      content: out.title,  // FIXED: Use title, not preview
      body: out.markdown,
      report_blocks: reportBlocks,  // ADDED: Structured blocks for rich rendering
      post_type: 'market-gap',
      tags: [params.dayTag, categoryTag, 'auto'],
    })
    .select('id')
    .single();

  if (postErr) throw new Error(`failed_to_publish: ${String(postErr.message || postErr)}`);
  // Persist run metadata (best effort)
  await recordReportRun({
    post_id: post.id,
    report_kind: 'market_gaps',
    run_id: out.artifacts?.run_id ?? null,
    status: 'success',
    model_name: (process.env.GEMINI_MODEL || 'gemini-3-pro-preview').trim(),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    inputs: {
      category: params.category,
      category_key: params.categoryKey,
      brands: params.brands,
      country_context: params.countryContext,
      day_tag: params.dayTag,
    },
    prompts: {
      writer_prompt: out.meta?.writer_prompt,
      report_blocks_prompt: reportBlocksMeta?.prompt,
    },
    outputs: {
      title: out.title,
      sources: out.sources,
      preview: out.preview,
      report_blocks_model: reportBlocksMeta?.model_name,
      report_blocks_raw_output: reportBlocksMeta?.raw_output,
    },
  });
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
    const modelName = (process.env.GEMINI_MODEL || 'gemini-3-pro-preview').trim();

    const limit = Math.max(10, Math.min(60, Number(req.body?.limit ?? 40) || 40));
    const countryContext = String(req.body?.country_context || 'India').trim() || 'India';
    const priority = Number(req.body?.priority ?? 90) || 90; // auto ideas should float to top
    const dryRun = String(req.body?.dry_run || '').toLowerCase() === 'true';

    // Ensure DB has recent news (Inc42 + Entrackr) so daily automation is reproducible/auditable.
    await upsertLatestNewsToDb();

    // Use DB-stored news as the LLM evidence, and dedupe against recent daily runs.
    const dedupeWindowDays = Number(req.body?.dedupe_window_days ?? 5) || 5;
    const itemsRaw = await getDedupedNewsForIdeaAgent({ limit, dedupeWindowDays });
    const items = itemsRaw.map(({ canonical_url, ...rest }) => rest);

    const prompt = `
Today's Date (UTC): ${yyyyMmDdUTC(new Date())}

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

    // Persist idea run + exact input evidence (best effort; tables may not exist yet).
    let ideaRunId: string | null = null;
    try {
      const day = yyyyMmDdUTC(new Date());
      const { data: runRow } = await supabase
        .from('daily_idea_runs')
        .insert({
          day,
          country_context: countryContext,
          input_limit: limit,
          input_count: items.length,
          model_name: modelName,
          prompt,
          raw_output: text,
          parsed_output: ideas,
          created_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();
      ideaRunId = runRow?.id || null;

      if (ideaRunId) {
        const rows = itemsRaw.map((x) => ({
          run_id: ideaRunId,
          news_url: x.url,
          canonical_url: x.canonical_url,
          title: x.title,
          source: x.source,
          published_at: x.date ? new Date(x.date).toISOString() : null,
          excerpt: x.excerpt,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('daily_idea_run_items').insert(rows as any);
      }
    } catch (e) {
      console.warn('daily_idea_runs persistence failed (best-effort):', (e as any)?.message || e);
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
        idea_run_id: ideaRunId,
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
      idea_run_id: ideaRunId,
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

      // Generate structured report blocks
      let reportBlocks = null;
      try {
        const rb = await generateReportBlocksFromMarkdownWithMeta({
          markdown: out.markdown,
          fallbackTitle: out.title || topic,
        });
        reportBlocks = rb.doc;
      } catch (e) {
        console.error('Failed to generate report blocks:', e);
      }

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.title,  // FIXED: Use title
          body: out.markdown,
          report_blocks: reportBlocks,  // ADDED
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

      // Generate structured report blocks
      let reportBlocks = null;
      try {
        const rb = await generateReportBlocksFromMarkdownWithMeta({
          markdown: out.markdown,
          fallbackTitle: out.title || category,
        });
        reportBlocks = rb.doc;
      } catch (e) {
        console.error('Failed to generate report blocks:', e);
      }

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.title,  // FIXED: Use title
          body: out.markdown,
          report_blocks: reportBlocks,  // ADDED
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

/**
 * POST /api/jobs/predictions/daily
 * Generate a few prediction questions from the same deduped daily news pool.
 * Idempotent per day (UTC) using `pred:day:YYYY-MM-DD` tag.
 */
export const runDailyPredictions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const modelName = (process.env.GEMINI_MODEL || 'gemini-3-pro-preview').trim();

    const communityId = await getCommunityIdBySlug('predictions');
    if (!communityId) {
      res.status(500).json({ error: 'predictions community not found' });
      return;
    }

    const day = yyyyMmDdUTC(new Date());
    const dayTag = `pred:day:${day}`;
    const alreadyRanToday = await postExistsByTag(communityId, dayTag);
    if (alreadyRanToday) {
      res.status(200).json({ ok: true, skipped: true, reason: 'already_ran_today', day: dayTag });
      return;
    }

    // Ensure DB has recent news and use deduped evidence set.
    await upsertLatestNewsToDb();
    const inputLimit = Math.max(10, Math.min(60, Number(req.body?.limit ?? 30) || 30));
    const dedupeWindowDays = Number(req.body?.dedupe_window_days ?? 5) || 5;
    const newsItemsRaw = await getDedupedNewsForIdeaAgent({ limit: inputLimit, dedupeWindowDays });
    const newsItems = newsItemsRaw.map(({ canonical_url, ...rest }) => rest);

    const count = Math.max(1, Math.min(5, Number(req.body?.count ?? 3) || 3));
    const countryContext = String(req.body?.country_context || 'India').trim() || 'India';

    const prompt = `
Today's Date (UTC): ${day}

You are writing prediction questions for a startup intelligence forum.
Use ONLY the provided news items as evidence.

Task:
- Generate EXACTLY ${count} prediction questions that will resolve in the future.
- Questions must be falsifiable and checkable.
- Prefer India-relevant predictions (${countryContext}).

Output JSON ONLY with schema:
{
  "predictions": [
    {
      "question": "string (yes/no question phrased clearly)",
      "headline": "string (short)",
      "category": "funding|expansion|regulatory|competition|leadership|ipo|acquisition|other",
      "initial_probability": 0.0,
      "resolution_date": "YYYY-MM-DD",
      "resolution_source_url": "must be one of the input URLs",
      "context": "1-3 short sentences grounded in the input"
    }
  ]
}

Rules:
- initial_probability must be between 0.05 and 0.95 (avoid 0/1).
- resolution_date must be within the next 12 months.
- resolution_source_url MUST be a URL from the provided input list (no invented links).
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const resp = await model.generateContent(`${prompt}\n\nNews Items:\n${JSON.stringify(newsItems, null, 2)}`, {
      generationConfig: { temperature: 0.4 },
    } as any);
    const raw = resp?.response?.text?.() ?? '';
    const parsed = safeJsonParse(raw) || {};
    const predsRaw = Array.isArray(parsed?.predictions) ? parsed.predictions : [];

    const systemUserId = await getSystemUserId();
    const created: string[] = [];
    for (const p of predsRaw.slice(0, count)) {
      const question = String(p?.question || '').trim();
      const headline = String(p?.headline || '').trim();
      const category = String(p?.category || 'other').trim();
      const resolutionDate = String(p?.resolution_date || '').trim();
      const resolutionSourceUrl = String(p?.resolution_source_url || '').trim();
      const initialProbability = Number(p?.initial_probability);
      const context = String(p?.context || '').trim();

      if (!question || !resolutionDate || !resolutionSourceUrl) continue;

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          post_type: 'prediction',
          content: question,
          body: context || null,
          headline: headline || null,
          prediction_category: category || 'other',
          initial_probability: Number.isFinite(initialProbability) ? initialProbability : 0.5,
          resolution_date: resolutionDate,
          resolution_source: resolutionSourceUrl,
          tags: [dayTag, 'auto'],
        } as any)
        .select('id')
        .single();

      if (postErr) {
        res.status(500).json({ error: 'failed_to_publish', details: String(postErr.message || postErr) });
        return;
      }
      created.push(post.id);

      await recordReportRun({
        post_id: post.id,
        report_kind: 'prediction',
        run_id: null,
        status: 'success',
        model_name: modelName,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        inputs: { day_tag: dayTag, country_context: countryContext },
        prompts: { prompt },
        outputs: { raw_output: raw, prediction: p },
      });
    }

    res.status(200).json({ ok: true, day, created_post_ids: created, input_count: newsItems.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};



