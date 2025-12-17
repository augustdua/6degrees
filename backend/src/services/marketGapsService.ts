import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type MarketGapsArtifacts = {
  run_id: string;
  dir: string;
  files: Record<string, string>;
};

export type MarketGapsResult = {
  markdown: string;
  sources: string[];
  preview: string;
  title: string;
  artifacts?: MarketGapsArtifacts;
};

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
};

function makeRunId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}_${rand}`;
}

function getRunsBaseDir(): string {
  const env = (process.env.MARKET_GAPS_RUNS_DIR || '').trim();
  if (env) return env;
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
  await writeText(filePath, JSON.stringify(data ?? null, null, 2));
}

function shaKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function maskKey(key: string): string {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.length <= 12) return `${k.slice(0, 3)}…(len=${k.length})`;
  return `${k.slice(0, 8)}…${k.slice(-4)} (len=${k.length})`;
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
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractTitle(markdown: string, fallback: string): string {
  const m = String(markdown || '').match(/^#\s+(.+?)$/m);
  const t = (m?.[1] || '').trim();
  return t || fallback;
}

function extractPreview(markdown: string, fallback: string): string {
  const md = String(markdown || '');
  const m = md.match(/##\s*TL;DR[^\n]*\n([\s\S]*?)(?=\n##|\n#|\Z)/i);
  if (m?.[1]) {
    const t = m[1].trim().replace(/\n{3,}/g, '\n\n').slice(0, 600);
    if (t) return t;
  }
  return (fallback || '').slice(0, 240);
}

async function geminiGenerate(prompt: string, temperature: number, artifacts?: MarketGapsArtifacts, name?: string): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  // NOTE: gemini-3-pro has been deprecated/removed from the API; default to a stable model.
  const modelName = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const resp = await model.generateContent(prompt, { generationConfig: { temperature } } as any);
  const text = resp?.response?.text?.() ?? '';
  if (artifacts && name) {
    const p = path.join(artifacts.dir, `${name}.txt`);
    artifacts.files[name] = p;
    await writeText(p, text);
  }
  return text;
}

async function perplexityDeepResearch(query: string, artifacts?: MarketGapsArtifacts, idx?: number): Promise<{ content: string; citations: string[] }> {
  const apiKey = (process.env.PERPLEXITY_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY');
  // Some Perplexity accounts don't have access to "sonar-deep-research".
  // Make the model configurable so production can switch without code changes.
  const modelName = (process.env.PERPLEXITY_MODEL || 'sonar-pro').trim() || 'sonar-pro';
  const debugLogs = String(process.env.PERPLEXITY_DEBUG_LOGS || '').toLowerCase() === 'true';
  const requestTag = `pplx_mg_${String(idx ?? 1).padStart(2, '0')}_${shaKey(query)}`;

  const payload = {
    model: modelName,
    messages: [
      {
        role: 'system',
        content: 'You are a dense data retrieval engine. Output ONLY detailed facts, statistics, and specific numbers. Cite every single claim. Do not summarize.',
      },
      { role: 'user', content: query },
    ],
  };

  if (debugLogs) {
    console.log(
      `[perplexity][${requestTag}] request: url=https://api.perplexity.ai/chat/completions model=${modelName} key=${maskKey(apiKey)} body_bytes=${Buffer.byteLength(
        JSON.stringify(payload),
        'utf8'
      )}`
    );
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Perplexity's edge can sometimes challenge "bot-like" requests (HTML 401/CF).
      // A browser-like UA + explicit Accept reduces false positives in production egress.
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; 6DegreesBot/1.0; +https://6degree.app)',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text().catch(() => '');
  if (debugLogs) {
    const ct = res.headers.get('content-type') || '';
    console.log(
      `[perplexity][${requestTag}] response: status=${res.status} ok=${res.ok} content_type=${ct} body_snippet=${JSON.stringify(
        rawText.slice(0, 400)
      )}`
    );
  }
  if (!res.ok) throw new Error(`Perplexity failed: ${res.status} ${rawText}`.trim());
  const json = JSON.parse(rawText) as PerplexityResponse;

  const content = String(json?.choices?.[0]?.message?.content || '');
  const citations = Array.isArray(json?.citations) ? json.citations.filter((u) => typeof u === 'string' && u.startsWith('http')) : [];

  if (artifacts) {
    const key = String(idx ?? 1).padStart(2, '0');
    const rawPath = path.join(artifacts.dir, `perplexity_${key}_raw.json`);
    const contentPath = path.join(artifacts.dir, `perplexity_${key}_content.md`);
    artifacts.files[`perplexity_${key}_raw`] = rawPath;
    artifacts.files[`perplexity_${key}_content`] = contentPath;
    await writeText(rawPath, rawText);
    await writeText(contentPath, content);
  }

  return { content, citations };
}

export async function generateMarketGapsReport(params: {
  category: string;
  brands: string[];
  timeHorizon?: string;
  countryContext?: string;
  debug?: boolean;
}): Promise<MarketGapsResult> {
  const category = params.category.trim();
  const brands = (params.brands || []).map((b) => String(b || '').trim()).filter(Boolean);
  const timeHorizon = (params.timeHorizon || '12-24 months').trim();
  const countryContext = (params.countryContext || 'India').trim();
  if (!category) throw new Error('Missing category');
  if (brands.length === 0) throw new Error('Missing brands');

  const saveRuns = params.debug === true || String(process.env.MARKET_GAPS_SAVE_RUNS || '').toLowerCase() === 'true';
  const run_id = makeRunId('market_gaps');
  const artifacts: MarketGapsArtifacts | undefined = saveRuns
    ? { run_id, dir: path.join(getRunsBaseDir(), 'market_gaps', run_id), files: {} }
    : undefined;
  if (artifacts) await ensureDir(artifacts.dir);
  if (artifacts) {
    await writeText(path.join(artifacts.dir, 'category.txt'), category);
    await writeJson(path.join(artifacts.dir, 'brands.json'), brands);
  }

  const sources = new Set<string>();
  const context: string[] = [];

  const q0 =
    `Comprehensive deep dive data on the D2C category: ${category}. ` +
    `Context: ${countryContext}. Focus on consumer segments, pricing tiers, purchase channels, ` +
    `unit economics, growth/GMV where available, and key brands/players including ${brands.join(', ')}. ` +
    `Also include common customer complaints, unmet needs, and switching triggers.`;

  const r0 = await perplexityDeepResearch(q0, artifacts, 1);
  context.push(r0.content);
  r0.citations.forEach((u) => sources.add(u));

  // Critic loop (max 3)
  let loop = 0;
  let criticReason = '';
  while (loop < 3) {
    const full = context.join('\n---\n');
    const criticPrompt = `
You are a ruthless D2C market analyst and editor.

We are researching this D2C space/category:
- Category: ${category}
- Brands in scope: ${JSON.stringify(brands)}
- Country context: ${countryContext}
- Time horizon: ${timeHorizon}

You are NOT writing the final report yet.
Your job is to judge whether the data is sufficient to identify:
1) 2–4 underserved segments (clear segmentation + why underserved)
2) 5–10 market gaps (what customers want but don't get) across the space (not a single brand)
3) evidence for each gap (frequency signals, price points, recurring complaints, switching behavior)

REJECT if:
- data lacks numbers/benchmarks (pricing, growth, cohort signals, churn, CAC, etc.)
- sources are stale or too bloggy
- too much focus on a single brand
- no clear customer segmentation

Return JSON only:
{
  "status": "APPROVED" | "REJECTED",
  "reasoning": "brief",
  "missing_information": [
    "specific research question 1",
    "specific research question 2"
  ]
}

Current Data:
${full}
`;
    if (artifacts) {
      const p = path.join(artifacts.dir, `critic_prompt_${loop + 1}.txt`);
      artifacts.files[`critic_prompt_${loop + 1}`] = p;
      await writeText(p, criticPrompt);
    }
    const criticRaw = await geminiGenerate(criticPrompt, 0.2, artifacts, `critic_response_${loop + 1}`);
    const critic = safeJsonParse(criticRaw) || {};
    criticReason = String(critic?.reasoning || '');
    const status = String(critic?.status || '').toUpperCase();
    if (status === 'APPROVED') break;
    const missing: string[] = Array.isArray(critic?.missing_information) ? critic.missing_information.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
    if (missing.length === 0) break;

    for (const q of missing.slice(0, 4)) {
      const ri = await perplexityDeepResearch(q, artifacts, context.length + 1);
      context.push(`Q: ${q}\nA: ${ri.content}`);
      ri.citations.forEach((u) => sources.add(u));
    }
    loop++;
  }

  // Writer (cards-style report)
  const fullData = context.join('\n---\n');
  const writerPrompt = `
Write a MARKET GAP / OPPORTUNITY analysis for this D2C space:

Category: ${category}
Brands (context only; you may mention them but do not make it brand-specific): ${JSON.stringify(brands)}
Country context: ${countryContext}
Time horizon: ${timeHorizon}

STYLE:
- Crisp, operator-focused, no fluff.
- Use specifics: numbers, price points, segments, named brands/players when supported by evidence.

HARD CONSTRAINTS:
- Every key claim that uses numbers or “market says” MUST have a citation right next to it.
- Use the citations already present in the Research Data; do NOT invent sources.
- If a needed citation is missing, explicitly label it as (needs source) instead of making it up.
- Output Markdown only.
- In the final "Sources" section, include the FULL URLs from the Source URLs list below (do not use [1]/[38] style only).

REQUIRED OUTPUT:
## TL;DR (5 bullets)
## Underserved segments (2–4)
For each segment:
- Who they are
- Why underserved (with evidence)
- What they currently do (workarounds)

## Market gap cards (5–10)
Each card MUST include:
- Gap (1 line)
- Target segment
- Evidence (bullets with citations; include at least 2 distinct sources if possible)
- Why now (trend/regulation/behavior)
- What to build first (MVP wedge)
- How to validate (quick tests)
- Risks / counterpoints

## Competitive map (short)
## 12–24 month outlook (2–4 falsifiable predictions)
## Sources (bulleted list of full URLs)

Research Data:
${fullData}

Source URLs (canonical list; include these as full URLs in Sources):
${Array.from(sources).sort().map((u) => `- ${u}`).join('\n') || '(none provided)'}

Critic's Notes:
${criticReason}
`;
  if (artifacts) {
    const p = path.join(artifacts.dir, 'writer_prompt.txt');
    artifacts.files['writer_prompt'] = p;
    await writeText(p, writerPrompt);
  }
  let markdown = await geminiGenerate(writerPrompt, 0.7, artifacts, 'final_report_md');

  // Safety net: if URLs not present, append
  const srcArr = Array.from(sources).sort();
  if (srcArr.length > 0 && !markdown.includes('http')) {
    markdown = `${markdown.trim()}\n\n## Sources\n${srcArr.map((u) => `- ${u}`).join('\n')}\n`;
  }

  const title = extractTitle(markdown, `Market Gaps: ${category}`);
  const preview = extractPreview(markdown, category);

  if (artifacts) {
    const srcPath = path.join(artifacts.dir, 'sources_urls.json');
    artifacts.files['sources_urls'] = srcPath;
    await writeJson(srcPath, srcArr);
  }

  return { markdown, sources: srcArr, preview, title, artifacts };
}



