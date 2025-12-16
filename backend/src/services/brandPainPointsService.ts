import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchRedditThreadByUrl, type RedditThread } from './redditService';
import { promises as fs } from 'fs';
import path from 'path';

export type BrandPainPointsReport = {
  brand_name: string;
  overall_sentiment: 'positive' | 'negative' | 'mixed' | 'neutral' | 'unknown';
  sentiment_score: number; // 0..1
  total_mentions: number;
  total_posts_analyzed: number;
  total_comments_analyzed: number;
  top_complaints: Array<{
    category: 'delivery' | 'quality' | 'pricing' | 'customer_support' | 'packaging' | 'returns' | 'other';
    issue: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
    quotes: string[];
  }>;
  competitors_mentioned: string[];
  opportunities: string[];
  summary: string;
  source_urls: string[];
  generated_at: string; // ISO
};

export type BrandPainPointsRunArtifacts = {
  run_id: string;
  dir: string;
  files: Record<string, string>; // logical name -> absolute path
};

export type BrandPainPointsRunResult = {
  report: BrandPainPointsReport;
  artifacts?: BrandPainPointsRunArtifacts;
};

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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
    // Try to extract a JSON object/array from a noisy response
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        // ignore
      }
    }
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]);
      } catch {
        // ignore
      }
    }
    return null;
  }
}

function makeRunId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}_${rand}`;
}

function getRunsBaseDir(): string {
  // Prefer explicit configuration; otherwise write to ./backend/runs when running from repo root,
  // and to ./runs when running from backend working directory.
  const env = (process.env.PAIN_POINTS_RUNS_DIR || '').trim();
  if (env) return env;
  // If repo-root has /backend, keep runs under backend/runs by default.
  return path.join(process.cwd(), 'backend', 'runs');
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function writeText(filePath: string, text: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, text ?? '', 'utf8');
}

async function writeJson(filePath: string, data: any): Promise<void> {
  const payload = JSON.stringify(data ?? null, null, 2);
  await writeText(filePath, payload);
}

function normalizeRedditThreadUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'reddit.com') return null;
    const path = u.pathname.replace(/\/$/, '');
    if (!path.includes('/comments/')) return null;
    return `https://www.reddit.com${path}`;
  } catch {
    return null;
  }
}

async function perplexityFindRedditUrls(params: {
  brandName: string;
  countryContext?: string;
  maxUrls?: number;
  debug?: { dir: string; files: Record<string, string> };
}): Promise<string[]> {
  const apiKey = (process.env.PERPLEXITY_API_KEY || '').trim();
  if (!apiKey) return [];

  const brandName = params.brandName;
  const maxUrls = params.maxUrls ?? 15;
  const countryContext = params.countryContext || 'India';
  const model = (process.env.PERPLEXITY_MODEL || 'sonar-pro').trim() || 'sonar-pro';

  const prompt = `Find high-signal Reddit threads containing real user complaints/reviews and unmet needs about the D2C brand "${brandName}".
Context: ${countryContext}.

Return STRICT JSON only:
{"urls": ["https://www.reddit.com/r/.../comments/...","..."]}

Rules:
- Only reddit.com thread URLs containing /comments/
- Prefer negative reviews, recurring issues, unmet demand, comparisons with competitors
- Max ${maxUrls} urls
`;

  if (params.debug) {
    const reqPath = path.join(params.debug.dir, 'step0_perplexity_request.json');
    params.debug.files['step0_perplexity_request'] = reqPath;
    await writeJson(reqPath, { model, temperature: 0.1, prompt });
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return JSON only. No markdown. No extra text.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Perplexity failed: ${res.status} ${text}`.trim());
  }

  const json = (await res.json()) as PerplexityResponse;
  if (params.debug) {
    const respPath = path.join(params.debug.dir, 'step0_perplexity_response.json');
    params.debug.files['step0_perplexity_response'] = respPath;
    await writeJson(respPath, json);
  }
  const content = String(json?.choices?.[0]?.message?.content || '');
  const parsed = safeJsonParse(content);

  let candidates: string[] = [];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).urls)) {
    candidates = (parsed as any).urls.filter((u: any) => typeof u === 'string');
  } else if (Array.isArray(json?.citations)) {
    candidates = json.citations.filter((u) => typeof u === 'string');
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of candidates) {
    const n = normalizeRedditThreadUrl(u);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= maxUrls) break;
  }

  if (params.debug) {
    const outPath = path.join(params.debug.dir, 'step0_reddit_urls.json');
    params.debug.files['step0_reddit_urls'] = outPath;
    await writeJson(outPath, out);
  }

  return out;
}

function flattenThreadComments(thread: RedditThread, maxComments: number): Array<{ body: string; score: number }> {
  const out: Array<{ body: string; score: number }> = [];
  const comments = thread.comments || [];
  for (const c of comments) {
    if (out.length >= maxComments) break;
    const body = (c.body || '').trim();
    if (!body) continue;
    out.push({ body, score: typeof c.score === 'number' ? c.score : 0 });
  }
  return out;
}

function buildFilterItems(threads: RedditThread[], maxPosts: number) {
  const items = [];
  for (let i = 0; i < Math.min(maxPosts, threads.length); i++) {
    const t = threads[i];
    items.push({
      index: i,
      type: 'post',
      id: t.post.id,
      title: (t.post.title || '').slice(0, 200),
      text: (t.post.selftext || '').slice(0, 500),
      subreddit: t.post.subreddit || 'unknown',
      url: t.post.url,
    });
  }
  return items;
}

export async function generateBrandPainPointsReport(params: {
  brandName: string;
  countryContext?: string;
  maxUrls?: number;
  maxCommentsPerPost?: number;
  debug?: boolean;
}): Promise<BrandPainPointsRunResult> {
  const brandName = params.brandName.trim();
  const countryContext = params.countryContext || 'India';
  const maxUrls = params.maxUrls ?? 15;
  const maxCommentsPerPost = params.maxCommentsPerPost ?? 50;

  const saveRuns = params.debug === true || String(process.env.PAIN_POINTS_SAVE_RUNS || '').toLowerCase() === 'true';
  const run_id = makeRunId('pain_points');
  const artifacts: BrandPainPointsRunArtifacts | undefined = saveRuns
    ? { run_id, dir: path.join(getRunsBaseDir(), 'pain_points', run_id), files: {} }
    : undefined;
  if (artifacts) await ensureDir(artifacts.dir);

  // Step 0: Perplexity sources (optional). If not configured, we error explicitly (this pipeline is Perplexity-first).
  const urls = await perplexityFindRedditUrls({
    brandName,
    countryContext,
    maxUrls,
    debug: artifacts ? { dir: artifacts.dir, files: artifacts.files } : undefined,
  });
  if (urls.length === 0) {
    throw new Error('No Reddit thread sources found (or PERPLEXITY_API_KEY not configured).');
  }

  // Step 1: Fetch threads via our Reddit OAuth approach
  const threads: RedditThread[] = [];
  for (const url of urls) {
    try {
      const t = await fetchRedditThreadByUrl(url, { commentLimit: maxCommentsPerPost });
      if (t?.post?.id) threads.push(t);
    } catch {
      // keep going
    }
  }
  if (threads.length === 0) {
    throw new Error('Failed to fetch any Reddit threads via OAuth.');
  }
  if (artifacts) {
    const p = path.join(artifacts.dir, 'step1_threads.json');
    artifacts.files['step1_threads'] = p;
    // Keep it reasonably sized
    const slim = threads.map((t) => ({
      post: t.post,
      comments_count: t.comments?.length || 0,
      comments: (t.comments || []).slice(0, maxCommentsPerPost),
    }));
    await writeJson(p, slim);
  }

  // Step 2: Agent 1 - filter nonsense/off-topic
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) throw new Error('Missing GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(geminiKey);
  const filterModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

  const filterItems = buildFilterItems(threads, 50);
  const filterPrompt = `You are a strict content filter for brand research.

Brand being analyzed: ${brandName}

Review these Reddit posts and identify which ones contain GENUINE USER FEEDBACK about the brand.

KEEP:
- Product reviews (positive or negative)
- Customer complaints about delivery, quality, service
- Price discussions
- Comparisons with competitors
- Personal experiences with the brand
- Unmet demand / feature requests / product gaps

REJECT:
- Promotional/spam content
- Off-topic mentions
- News articles without user opinions
- Generic questions not about brand experience
- Memes / jokes / low-signal chatter
- Content where the brand is only mentioned in passing

Posts to filter:
${JSON.stringify(filterItems)}

Return ONLY a JSON array of indices to KEEP.
Example: [0, 2, 5]`;

  if (artifacts) {
    const p = path.join(artifacts.dir, 'step2_filter_prompt.txt');
    artifacts.files['step2_filter_prompt'] = p;
    await writeText(p, filterPrompt);
  }

  const filterResult = await filterModel.generateContent(filterPrompt);
  const filterText = filterResult.response.text();
  if (artifacts) {
    const p = path.join(artifacts.dir, 'step2_filter_response.txt');
    artifacts.files['step2_filter_response'] = p;
    await writeText(p, filterText);
  }
  const keepParsed = safeJsonParse(filterText);
  const keepIndices: number[] = Array.isArray(keepParsed)
    ? keepParsed
        .map((x) => (typeof x === 'number' ? x : typeof x === 'string' && /^\d+$/.test(x) ? Number(x) : null))
        .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    : [];
  if (artifacts) {
    const p = path.join(artifacts.dir, 'step2_keep_indices.json');
    artifacts.files['step2_keep_indices'] = p;
    await writeJson(p, keepIndices);
  }

  const keptThreads = keepIndices.length
    ? keepIndices.filter((i) => i >= 0 && i < threads.length).map((i) => threads[i])
    : threads;

  // Step 3: Agent 2 - opportunity report
  const analyzeModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

  const allContentParts: string[] = [];
  for (const t of keptThreads.slice(0, 30)) {
    allContentParts.push(`[POST] r/${t.post.subreddit || 'unknown'} | Score: ${t.post.score || 0}\nTitle: ${t.post.title}\n${(t.post.selftext || '').slice(0, 1000)}`);
    for (const c of flattenThreadComments(t, 25)) {
      allContentParts.push(`[COMMENT] Score: ${c.score}\n${c.body.slice(0, 400)}`);
    }
  }
  const contentText = allContentParts.join('\n\n---\n\n').slice(0, 50_000);

  const analyzePrompt = `You are a D2C product strategist. Your goal is to find NEGATIVE REVIEWS and UNMET DEMAND signals for "${brandName}" from Reddit discussions.

REDDIT CONTENT:
${contentText}

Return ONLY valid JSON with this schema:
{
  "overall_sentiment": "positive|negative|mixed|neutral",
  "sentiment_score": <float 1-5 where 1=very negative, 5=very positive>,
  "top_complaints": [
    {
      "category": "delivery|quality|pricing|customer_support|packaging|returns|other",
      "issue": "brief issue statement",
      "count": <approx mentions>,
      "severity": "high|medium|low",
      "quotes": ["real quote 1", "real quote 2"]
    }
  ],
  "competitors_mentioned": ["..."],
  "opportunities": ["concrete, testable idea tied to complaints/unmet demand"],
  "summary": "2-3 sentence executive summary focusing on opportunities"
}

Rules:
- Focus on negative reviews + unmet demand.
- Use REAL quotes from the content only (no fabrication).
- Be specific and actionable.`;

  if (artifacts) {
    const p = path.join(artifacts.dir, 'step3_analyze_prompt.txt');
    artifacts.files['step3_analyze_prompt'] = p;
    await writeText(p, analyzePrompt);
  }

  const analysisResult = await analyzeModel.generateContent(analyzePrompt);
  const analysisText = analysisResult.response.text();
  if (artifacts) {
    const p = path.join(artifacts.dir, 'step3_analyze_response.txt');
    artifacts.files['step3_analyze_response'] = p;
    await writeText(p, analysisText);
  }
  const analysis = safeJsonParse(analysisText) || {};
  if (artifacts) {
    const p = path.join(artifacts.dir, 'step3_analyze_parsed.json');
    artifacts.files['step3_analyze_parsed'] = p;
    await writeJson(p, analysis);
  }

  const sentiment1to5 = typeof analysis.sentiment_score === 'number' ? analysis.sentiment_score : 3.0;
  const sentiment01 = clamp((sentiment1to5 - 1) / 4, 0, 1);

  const complaints = Array.isArray(analysis.top_complaints) ? analysis.top_complaints : [];
  const competitors = Array.isArray(analysis.competitors_mentioned) ? analysis.competitors_mentioned : [];
  const opportunities = Array.isArray(analysis.opportunities) ? analysis.opportunities : [];

  const sourceUrls = keptThreads.map((t) => t.post.url).filter(Boolean);

  const report: BrandPainPointsReport = {
    brand_name: brandName,
    overall_sentiment: (analysis.overall_sentiment as any) || 'unknown',
    sentiment_score: sentiment01,
    total_mentions: keptThreads.length + keptThreads.reduce((acc, t) => acc + (t.comments?.length || 0), 0),
    total_posts_analyzed: keptThreads.length,
    total_comments_analyzed: keptThreads.reduce((acc, t) => acc + (t.comments?.length || 0), 0),
    top_complaints: complaints,
    competitors_mentioned: competitors,
    opportunities,
    summary: typeof analysis.summary === 'string' ? analysis.summary : '',
    source_urls: sourceUrls.slice(0, 20),
    generated_at: new Date().toISOString(),
  };

  if (artifacts) {
    const p = path.join(artifacts.dir, 'step4_report.json');
    artifacts.files['step4_report'] = p;
    await writeJson(p, report);
  }

  return { report, artifacts };
}


