import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';

type LikertQuestion = {
  text: string;
  category: string;
  display_order: number;
};

function normText(s: string) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

function categoryFromCode(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith('EXT')) return 'big5_ext';
  if (c.startsWith('EST')) return 'big5_est';
  if (c.startsWith('AGR')) return 'big5_agr';
  if (c.startsWith('CSN')) return 'big5_csn';
  if (c.startsWith('OPN')) return 'big5_opn';
  return 'likert_pool';
}

function parseLikertBank(raw: string): LikertQuestion[] {
  const lines = raw.split(/\r?\n/);
  const out: LikertQuestion[] = [];
  let poolOrder = 2000;

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;

    // Big Five lines like: EXT1 I am the life of the party.
    const big5 = line.match(/^([A-Z]{3}\d{1,3})\s+(.+)$/);
    if (big5) {
      const code = big5[1];
      const text = normText(big5[2]);
      if (!text) continue;
      out.push({
        text,
        category: categoryFromCode(code),
        display_order: 1000 + (parseInt(code.replace(/^\D+/, ''), 10) || 0),
      });
      continue;
    }

    // Numbered pool like: 12. Most people...
    const numbered = line.match(/^(\d{1,4})\.\s+(.+)$/);
    if (numbered) {
      const n = parseInt(numbered[1], 10);
      const text = normText(numbered[2]);
      if (!text) continue;
      out.push({
        text,
        category: 'likert_pool',
        display_order: 2000 + (Number.isFinite(n) ? n : poolOrder++),
      });
      continue;
    }

    // Fallback: treat any other line as a question (rare)
    out.push({
      text: normText(line),
      category: 'likert_pool',
      display_order: poolOrder++,
    });
  }

  // De-dupe by normalized text
  const seen = new Set<string>();
  const deduped: LikertQuestion[] = [];
  for (const q of out) {
    const k = q.text.toLowerCase();
    if (!q.text) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(q);
  }
  return deduped;
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1';
  const filePath =
    process.env.BANK_PATH ||
    path.join(__dirname, 'data', 'personality_questions_likert.txt');

  const raw = fs.readFileSync(filePath, 'utf8');
  const questions = parseLikertBank(raw);

  console.log(`[seed] parsed=${questions.length} file=${filePath} dryRun=${dryRun}`);
  console.log('[seed] sample:', questions.slice(0, 5));

  if (dryRun) return;

  const rows = questions.map((q) => ({
    type: 'likert',
    text: q.text,
    category: q.category,
    is_active: true,
    display_order: q.display_order,
  }));

  const { error } = await supabase
    .from('personality_questions')
    .upsert(rows as any, { onConflict: 'text' });

  if (error) {
    console.error('[seed] upsert error:', error);
    process.exit(1);
  }

  console.log(`[seed] upsert ok: ${rows.length} rows`);
}

main().catch((e) => {
  console.error('[seed] fatal:', e);
  process.exit(1);
});


