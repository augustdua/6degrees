import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type MarketResearchArtifacts = {
  run_id: string;
  dir: string;
  files: Record<string, string>;
};

export type MarketResearchResult = {
  markdown: string;
  sources: string[];
  preview: string;
  title: string;
  artifacts?: MarketResearchArtifacts;
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
  const env = (process.env.MARKET_RESEARCH_RUNS_DIR || '').trim();
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
    const t = m[1]
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 600);
    if (t) return t;
  }
  return (fallback || '').slice(0, 240);
}

function geminiText(params: { prompt: string; temperature: number; responseMimeType?: string }): string {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const modelName = (process.env.GEMINI_MODEL || 'models/gemini-3-pro').trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  // google-generative-ai accepts generationConfig; response_mime_type isn't supported across all versions.
  return model.generateContent(params.prompt, { generationConfig: { temperature: params.temperature } } as any).then((r: any) => r?.response?.text?.() ?? '') as any;
}

async function geminiGenerate(prompt: string, temperature: number, artifacts?: MarketResearchArtifacts, name?: string): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const modelName = (process.env.GEMINI_MODEL || 'models/gemini-3-pro').trim();
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

async function perplexityDeepResearch(query: string, artifacts?: MarketResearchArtifacts, idx?: number): Promise<{ content: string; citations: string[]; raw: any }> {
  const apiKey = (process.env.PERPLEXITY_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY');

  const payload = {
    model: 'sonar-deep-research',
    messages: [
      {
        role: 'system',
        content: 'You are a dense data retrieval engine. Output ONLY detailed facts, statistics, and specific numbers. Cite every single claim. Do not summarize.',
      },
      { role: 'user', content: query },
    ],
  };

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text().catch(() => '');
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

  return { content, citations, raw: json };
}

export async function generateMarketResearchReport(params: {
  topic: string;
  debug?: boolean;
}): Promise<MarketResearchResult> {
  const topic = params.topic.trim();
  if (!topic) throw new Error('Missing topic');

  const saveRuns = params.debug === true || String(process.env.MARKET_RESEARCH_SAVE_RUNS || '').toLowerCase() === 'true';
  const run_id = makeRunId('market_research');
  const artifacts: MarketResearchArtifacts | undefined = saveRuns
    ? { run_id, dir: path.join(getRunsBaseDir(), 'market_research', run_id), files: {} }
    : undefined;
  if (artifacts) await ensureDir(artifacts.dir);
  if (artifacts) {
    await writeText(path.join(artifacts.dir, 'topic.txt'), topic);
  }

  const sources = new Set<string>();
  const context: string[] = [];

  // 1) Broad retrieval
  const q0 = `Comprehensive deep dive data on ${topic}. Market size, players, risks.`;
  const r0 = await perplexityDeepResearch(q0, artifacts, 1);
  context.push(r0.content);
  r0.citations.forEach((u) => sources.add(u));

  // 2) Critic loop (max 3)
  let loop = 0;
  let criticReason = '';
  while (loop < 3) {
    const full = context.join('\n---\n');
    const criticPrompt = `
You are a ruthless Senior Editor. Review the research data below for the topic: '${topic}'.

Current Data:
${full}

Determine if this is sufficient to write a World-Class Report.
CRITERIA:
1. Are there specific hard numbers (TAM, CAGR, Revenue)?
2. Are the sources recent (late 2024/2025)?
3. are there counter-arguments/risks?

Response Format (JSON only):
{
  "status": "APPROVED" or "REJECTED",
  "reasoning": "Brief explanation",
  "missing_information": ["specific question 1", "specific question 2"]
}
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

    // targeted re-research
    const take = missing.slice(0, 4);
    for (let i = 0; i < take.length; i++) {
      const q = take[i];
      const ri = await perplexityDeepResearch(q, artifacts, context.length + 1);
      context.push(`Q: ${q}\nA: ${ri.content}`);
      ri.citations.forEach((u) => sources.add(u));
    }

    loop++;
  }

  // 3) Writer
  const fullData = context.join('\n---\n');
  const writerPrompt = `
Write a market research deep dive on: ${topic}

STYLE (match trends.vc vibe):
- Strong, editorial, story-led narrative (not academic, not generic)
- Dense with specific numbers, dates, and named players
- Crisp paragraphs; avoid fluff; avoid "As an AI..." disclaimers
- Confident but honest about uncertainty; call out assumptions

HARD CONSTRAINTS:
- Every key claim that uses numbers or “market says” MUST have a citation right next to it.
- Use the citations already present in the Research Data; do not invent sources.
- If a needed citation is missing, explicitly label it as (needs source) instead of making it up.
- Output: Markdown only
- In the final "Sources" section, include the FULL URLs from the Source URLs list provided below (do not use [1]/[38] style only).

REQUIRED STRUCTURE (use these headers):
1) TL;DR (5 bullets)
2) The big shift (what changed + why now)
3) Market size & growth (TAM/SAM/SOM where possible, CAGR, pricing)
4) Who’s winning (market map: incumbents vs startups; what they sell; differentiation)
5) Buyer behavior & budgets (who pays, procurement, sales cycle)
6) What’s actually working (tactics, workflows, case examples with metrics)
7) Risks & counter-arguments (regulatory, technical, economic, adoption)
8) 12–24 month outlook (2–4 falsifiable predictions)
9) Sources (bulleted list of URLs/attributions found in the Research Data)

Research Data:
${fullData}

Source URLs (canonical list; include these as full URLs in the Sources section):
${Array.from(sources).sort().map((u) => `- ${u}`).join('\n') || '(none provided)'}

Critic's Notes (Address these risks):
${criticReason}
`;
  if (artifacts) {
    const p = path.join(artifacts.dir, 'writer_prompt.txt');
    artifacts.files['writer_prompt'] = p;
    await writeText(p, writerPrompt);
  }
  const markdown = await geminiGenerate(writerPrompt, 0.7, artifacts, 'final_report_md');

  const sourcesArr = Array.from(sources).sort();
  const title = extractTitle(markdown, topic);
  const preview = extractPreview(markdown, topic);

  if (artifacts) {
    const srcPath = path.join(artifacts.dir, 'sources_urls.json');
    artifacts.files['sources_urls'] = srcPath;
    await writeJson(srcPath, sourcesArr);
  }

  return { markdown, sources: sourcesArr, preview, title, artifacts };
}



