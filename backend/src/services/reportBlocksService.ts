import { GoogleGenerativeAI } from '@google/generative-ai';

export type ReportBlock =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'callout'; title?: string; items: string[] }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'embed'; url: string; provider?: string; height?: number }
  | { type: 'divider' };

export type ReportDocument = {
  version: 1;
  title: string;
  blocks: ReportBlock[];
};

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
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeTitleFromMarkdown(markdown: string, fallback: string): string {
  const m = String(markdown || '').match(/^#\s+(.+?)$/m);
  const t = (m?.[1] || '').trim();
  return t || fallback;
}

function isNonEmptyString(x: any): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

function validateReportDocument(doc: any): ReportDocument | null {
  if (!doc || typeof doc !== 'object') return null;
  
  // Make version and title optional if they are missing but blocks exist
  const version = Number(doc.version || 1);
  const title = String(doc.title || '').trim();
  const blocksRaw = Array.isArray(doc.blocks) ? doc.blocks : [];
  
  if (blocksRaw.length === 0) return null;

  const blocks: ReportBlock[] = [];
  for (const b of blocksRaw) {
    if (!b || typeof b !== 'object') continue;
    const type = String((b as any).type || '');
    if (!type) continue;

    if (type === 'heading') {
      const level = Number((b as any).level || 2);
      const text = String((b as any).text || '').trim();
      if (text) {
        blocks.push({ type: 'heading', level: (level === 2 || level === 3 || level === 4) ? level as 2 | 3 | 4 : 2, text });
      }
      continue;
    }

    if (type === 'paragraph') {
      const text = String((b as any).text || '').trim();
      if (text) blocks.push({ type: 'paragraph', text });
      continue;
    }

    if (type === 'bullets' || type === 'numbered') {
      const items = Array.isArray((b as any).items) ? (b as any).items.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      if (items.length > 0) blocks.push({ type: type as 'bullets' | 'numbered', items });
      continue;
    }

    if (type === 'callout') {
      const title = isNonEmptyString((b as any).title) ? String((b as any).title).trim() : undefined;
      const items = Array.isArray((b as any).items) ? (b as any).items.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      if (items.length > 0) blocks.push({ type: 'callout', title, items });
      continue;
    }

    if (type === 'table') {
      const caption = isNonEmptyString((b as any).caption) ? String((b as any).caption).trim() : undefined;
      const headers = Array.isArray((b as any).headers) ? (b as any).headers.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      const rowsRaw = Array.isArray((b as any).rows) ? (b as any).rows : [];
      const rows: string[][] = rowsRaw
        .map((r: any) => (Array.isArray(r) ? r.map((x: any) => String(x || '').trim()) : []))
        .filter((r: string[]) => r.length > 0);
      // Guardrail: avoid “mega-table” broken outputs
      const cellCharLimit = 600;
      const tooLong = rows.some((r) => r.some((c) => c.length > cellCharLimit));
      if (!tooLong && headers.length > 0 && rows.length > 0) {
        blocks.push({ type: 'table', caption, headers, rows });
      }
      continue;
    }

    if (type === 'embed') {
      const url = String((b as any).url || '').trim();
      const provider = isNonEmptyString((b as any).provider) ? String((b as any).provider).trim() : undefined;
      const height = Number((b as any).height) || undefined;
      if (url && (url.startsWith('http') || url.startsWith('https'))) {
        blocks.push({ type: 'embed', url, provider, height });
      }
      continue;
    }

    if (type === 'divider') {
      blocks.push({ type: 'divider' });
      continue;
    }
  }

  if (blocks.length === 0) return null;
  return { version: 1, title: title || 'Untitled Report', blocks };
}

export async function generateReportBlocksFromMarkdown(params: {
  markdown: string;
  fallbackTitle: string;
  model?: string; // default gemini-2.0-flash
}): Promise<ReportDocument> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const md = String(params.markdown || '').trim();
  if (!md) throw new Error('Missing markdown body');

  const title = normalizeTitleFromMarkdown(md, params.fallbackTitle);
  const modelName = (params.model || process.env.GEMINI_REPORT_BLOCKS_MODEL || 'gemini-2.0-flash').trim();

  const prompt = `
You are a strict document parser.

Convert the following Markdown report into a JSON document that can be rendered as UI blocks (Notion-like).

Hard rules:
- Do NOT change facts, numbers, dates, or claims.
- Do NOT add or remove sources/URLs. Keep citations exactly as they appear (e.g. [1], [29], full URLs).
- Keep the content meaning the same; only restructure into blocks.
- Output MUST be valid JSON only (no markdown fences).
- Keep bullets short where possible (split long bullets into multiple bullets).
- Tables: if a table is present, represent it as a "table" block with headers+rows. Do NOT create giant cells.

Output JSON schema (exact):
{
  "version": 1,
  "title": string,
  "blocks": [
    { "type": "callout", "title"?: string, "items": string[] },        // use for TL;DR
    { "type": "heading", "level": 2|3|4, "text": string },
    { "type": "paragraph", "text": string },
    { "type": "bullets", "items": string[] },
    { "type": "numbered", "items": string[] },
    { "type": "table", "caption"?: string, "headers": string[], "rows": string[][] },
    { "type": "embed", "url": string, "provider"?: string, "height"?: number },
    { "type": "divider" }
  ]
}

- For Embeds: if you see a URL that is a visual asset or a "Share" link (e.g. napkin.ai, youtube, vimeo), put it in an "embed" block.

Title to use (prefer this if no H1 exists): ${JSON.stringify(title)}

Markdown report:
${md}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const resp = await model.generateContent(prompt, { generationConfig: { temperature: 0.1 } } as any);
  const text = resp?.response?.text?.() ?? '';

  const parsed = safeJsonParse(text);
  const valid = validateReportDocument(parsed);
  if (!valid) {
    throw new Error('Failed to parse report blocks JSON from Gemini output');
  }
  return valid;
}

export async function generateReportBlocksFromMarkdownWithMeta(params: {
  markdown: string;
  fallbackTitle: string;
  model?: string; // default gemini-2.0-flash
}): Promise<{ doc: ReportDocument; prompt: string; raw_output: string; model_name: string }> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const md = String(params.markdown || '').trim();
  if (!md) throw new Error('Missing markdown body');

  const title = normalizeTitleFromMarkdown(md, params.fallbackTitle);
  const modelName = (params.model || process.env.GEMINI_REPORT_BLOCKS_MODEL || 'gemini-2.0-flash').trim();

  const prompt = `
You are a strict document parser.

Convert the following Markdown report into a JSON document that can be rendered as UI blocks (Notion-like).

Hard rules:
- Do NOT change facts, numbers, dates, or claims.
- Do NOT add or remove sources/URLs. Keep citations exactly as they appear (e.g. [1], [29], full URLs).
- Keep the content meaning the same; only restructure into blocks.
- Output MUST be valid JSON only (no markdown fences).
- Keep bullets short where possible (split long bullets into multiple bullets).
- Tables: if a table is present, represent it as a "table" block with headers+rows. Do NOT create giant cells.

Output JSON schema (exact):
{
  "version": 1,
  "title": string,
  "blocks": [
    { "type": "callout", "title"?: string, "items": string[] },        // use for TL;DR
    { "type": "heading", "level": 2|3|4, "text": string },
    { "type": "paragraph", "text": string },
    { "type": "bullets", "items": string[] },
    { "type": "numbered", "items": string[] },
    { "type": "table", "caption"?: string, "headers": string[], "rows": string[][] },
    { "type": "embed", "url": string, "provider"?: string, "height"?: number },
    { "type": "divider" }
  ]
}

- For Embeds: if you see a URL that is a visual asset or a "Share" link (e.g. napkin.ai, youtube, vimeo), put it in an "embed" block.

Title to use (prefer this if no H1 exists): ${JSON.stringify(title)}

Markdown report:
${md}
`.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const resp = await model.generateContent(prompt, { generationConfig: { temperature: 0.1 } } as any);
  const raw_output = resp?.response?.text?.() ?? '';

  const parsed = safeJsonParse(raw_output);
  const valid = validateReportDocument(parsed);
  if (!valid) {
    throw new Error('Failed to parse report blocks JSON from Gemini output');
  }
  return { doc: valid, prompt, raw_output, model_name: modelName };
}



