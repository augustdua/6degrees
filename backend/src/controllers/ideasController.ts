import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthenticatedRequest } from '../types';
import { fetchDailyIdeaNews } from '../services/newsService';

function requireCronSecret(req: AuthenticatedRequest): boolean {
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) return false;
  const provided = String(req.header('x-cron-secret') || req.query?.cron_secret || '').trim();
  return Boolean(provided && provided === expected);
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

/**
 * POST /api/jobs/ideas/preview
 * Protected by x-cron-secret (CRON_SECRET env).
 * Returns a JSON-only "idea selection" output (no DB write, no report generation).
 */
export const previewDailyIdeas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const modelName = (process.env.GEMINI_MODEL || 'models/gemini-3-pro').trim();

    const limit = Math.max(10, Math.min(60, Number(req.body?.limit ?? 40) || 40));
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
      res.status(500).json({ error: 'Agent did not return JSON', raw: text });
      return;
    }

    res.status(200).json({
      ok: true,
      input_count: items.length,
      ideas: json,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};


