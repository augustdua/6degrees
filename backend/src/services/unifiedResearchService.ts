import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UnifiedResearchArtifacts = {
  run_id: string;
  dir: string;
  files: Record<string, string>;
};

export type UnifiedResearchResult = {
  markdown: string;
  sources: string[];
  preview: string;
  title: string;
  artifacts?: UnifiedResearchArtifacts;
  meta?: {
    model_name?: string;
    perplexity_model?: string;
    writer_prompt?: string;
  };
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
  const env = (process.env.UNIFIED_RESEARCH_RUNS_DIR || process.env.MARKET_RESEARCH_RUNS_DIR || '').trim();
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

async function geminiGenerate(prompt: string, temperature: number, artifacts?: UnifiedResearchArtifacts, name?: string): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
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

async function perplexityDeepResearch(query: string, artifacts?: UnifiedResearchArtifacts, idx?: number): Promise<{ content: string; citations: string[] }> {
  const apiKey = (process.env.PERPLEXITY_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY');
  const modelName = (process.env.PERPLEXITY_MODEL || 'sonar-deep-research').trim();

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

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; 6DegreesBot/1.0; +https://6degree.app)',
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

  return { content, citations };
}

/**
 * Generate a unified research report that combines market analysis + gap/opportunity identification.
 * This merges the old Market Research and Market Gaps reports into one flagship daily report.
 */
export async function generateUnifiedResearchReport(params: {
  topic: string;
  countryContext?: string;
  debug?: boolean;
}): Promise<UnifiedResearchResult> {
  const topic = params.topic.trim();
  const countryContext = (params.countryContext || 'India').trim();
  if (!topic) throw new Error('Missing topic');

  const saveRuns = params.debug === true || String(process.env.UNIFIED_RESEARCH_SAVE_RUNS || process.env.MARKET_RESEARCH_SAVE_RUNS || '').toLowerCase() === 'true';
  const run_id = makeRunId('unified_research');
  const artifacts: UnifiedResearchArtifacts | undefined = saveRuns
    ? { run_id, dir: path.join(getRunsBaseDir(), 'unified_research', run_id), files: {} }
    : undefined;
  if (artifacts) await ensureDir(artifacts.dir);
  if (artifacts) {
    await writeText(path.join(artifacts.dir, 'topic.txt'), topic);
  }

  const sources = new Set<string>();
  const context: string[] = [];

  // 1) Broad market retrieval
  const q0 = `Comprehensive deep dive data on ${topic} in ${countryContext}. Market size, key players, recent funding, risks, and controversies.`;
  const r0 = await perplexityDeepResearch(q0, artifacts, 1);
  context.push(r0.content);
  r0.citations.forEach((u) => sources.add(u));

  // 2) Gap/opportunity-focused retrieval
  const q1 = `What are the unmet needs, underserved segments, and market gaps in ${topic}? Focus on ${countryContext}. Include customer complaints, switching behavior, and what incumbents are missing.`;
  const r1 = await perplexityDeepResearch(q1, artifacts, 2);
  context.push(r1.content);
  r1.citations.forEach((u) => sources.add(u));

  // 3) Contrarian/controversy retrieval
  const q2 = `What are the controversial opinions, bear cases, and counter-arguments about ${topic}? What do skeptics say? What could go wrong? Focus on ${countryContext} context.`;
  const r2 = await perplexityDeepResearch(q2, artifacts, 3);
  context.push(r2.content);
  r2.citations.forEach((u) => sources.add(u));

  // 4) Unified critic loop (max 2)
  let loop = 0;
  let criticReason = '';
  while (loop < 2) {
    const full = context.join('\n---\n');
    const criticPrompt = `
You are a ruthless Senior Editor for a startup intelligence newsletter.
Review the research data below for the topic: '${topic}' (${countryContext}).

Current Data:
${full}

Determine if this is sufficient to write a COMPELLING, CONTROVERSY-SPARKING report.
CRITERIA:
1. Are there specific hard numbers (TAM, CAGR, Revenue, funding amounts)?
2. Are the sources recent (2024/2025)?
3. Is there a clear TENSION or CONTROVERSY (bulls vs bears, regulation vs growth, incumbents vs disruptors)?
4. Are there identifiable GAPS or OPPORTUNITIES (underserved segments, unmet needs)?
5. Can we make BOLD, FALSIFIABLE predictions?

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
    const take = missing.slice(0, 3);
    for (const q of take) {
      const ri = await perplexityDeepResearch(q, artifacts, context.length + 1);
      context.push(`Q: ${q}\nA: ${ri.content}`);
      ri.citations.forEach((u) => sources.add(u));
    }

    loop++;
  }

  // 5) Unified Writer
  const fullData = context.join('\n---\n');
  const writerPrompt = `
Write a unified research report on: ${topic}
Country context: ${countryContext}

STYLE (think: Morning Brew meets trends.vc):
- Strong, editorial, story-led narrative (not academic, not generic)
- Start with a HOOK that makes people want to read
- Dense with specific numbers, dates, and named players
- Crisp paragraphs; avoid fluff; avoid "As an AI..." disclaimers
- Confident but honest about uncertainty; call out assumptions
- MAKE IT INTERESTING - this should spark discussion and debate

HARD CONSTRAINTS:
- Every key claim that uses numbers or "market says" MUST have a citation right next to it.
- Use the citations already present in the Research Data; do not invent sources.
- If a needed citation is missing, explicitly label it as (needs source) instead of making it up.
- Output: Markdown only
- In the final "Sources" section, include the FULL URLs from the Source URLs list provided below.
- PRESERVE ALL NUMBERS EXACTLY (₹1,850 must stay ₹1,850, currency symbols intact).

REQUIRED STRUCTURE (use these exact headers):
# [Catchy Title - make it provocative/interesting]

## TL;DR
5 bullets that give the key insights. First bullet should be the HOOK.

## The Big Shift
What changed? Why now? What's the tension/controversy here?
Include the "why people disagree" angle.

## Market Landscape
- Size & growth (TAM, CAGR, pricing)
- Who's winning (incumbents vs startups)
- Key players and what they're doing differently

## Where's the Gap?
2-4 underserved segments or market opportunities:
- Who is being ignored?
- What do customers want but can't get?
- What are the incumbents missing?

## Contrarian Take
What do smart people disagree on? What's the bear case?
Present BOTH sides of the debate fairly.

## 12-24 Month Predictions
3-4 BOLD, FALSIFIABLE predictions. Be specific with timelines.
Example: "By Q3 2025, [X] will [Y] because [Z]"

## Sources
Bulleted list of full URLs.

Research Data:
${fullData}

Source URLs (canonical list; include these as full URLs in Sources):
${Array.from(sources).sort().map((u) => `- ${u}`).join('\n') || '(none provided)'}

Critic's Notes (Address these):
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

  return {
    markdown,
    sources: sourcesArr,
    preview,
    title,
    artifacts,
    meta: {
      model_name: (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim(),
      perplexity_model: (process.env.PERPLEXITY_MODEL || 'sonar-deep-research').trim(),
      writer_prompt: writerPrompt,
    },
  };
}

