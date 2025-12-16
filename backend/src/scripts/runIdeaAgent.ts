/**
 * Local runner: generate daily ideas from RSS (Inc42 + Entrackr) using Gemini.
 *
 * Run:
 *   cd backend
 *   npx tsx src/scripts/runIdeaAgent.ts --limit 40
 *
 * Env required:
 *   GEMINI_API_KEY
 * Optional:
 *   GEMINI_MODEL (default: models/gemini-3-pro)
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchDailyIdeaNews } from '../services/newsService';

dotenv.config();

function parseArgs(argv: string[]): { limit: number } {
  const out = { limit: 40 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit' || a === '-l') {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n)) out.limit = n;
      i++;
    }
  }
  out.limit = Math.max(10, Math.min(60, out.limit));
  return out;
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

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('❌ Missing GEMINI_API_KEY');
    process.exit(1);
  }
  const modelName = (process.env.GEMINI_MODEL || 'models/gemini-3-pro').trim();

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
2) ONE Market Gap category: a mature category where new segments/gaps are emerging (still needs validation).

Output JSON ONLY with this schema:
{
  "market_research": {
    "topic": "string",
    "why_now": ["bullet", "bullet", "bullet"],
    "signals": [{"title":"", "url":"", "source":"", "date":""}],
    "keywords": ["..."]
  },
  "market_gaps": {
    "category": "string",
    "hypothesis": "string",
    "segments": ["..."],
    "why_now": ["..."],
    "signals": [{"title":"", "url":"", "source":"", "date":""}],
    "keywords": ["..."]
  }
}

Rules:
- Signals MUST reference URLs from the provided input. Do not invent links.
- Prefer India-relevant topics.
- Avoid generic topics like "AI is booming"; make it specific (industry + wedge + why now).
- Market gaps should be phrased as: "<category> in <market> — <new segment or unmet need>".
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const resp = await model.generateContent(`${prompt}\n\nNews Items:\n${JSON.stringify(items, null, 2)}`, {
    generationConfig: { temperature: 0.4 },
  } as any);

  const text = resp?.response?.text?.() ?? '';
  const json = safeJsonParse(text);

  if (!json) {
    console.error('❌ Agent did not return JSON.');
    console.error(text);
    process.exit(2);
  }

  console.log(JSON.stringify({ ok: true, input_count: items.length, ideas: json }, null, 2));
}

main().catch((e) => {
  console.error('❌ Failed to run idea agent:', e?.message || e);
  process.exit(1);
});


