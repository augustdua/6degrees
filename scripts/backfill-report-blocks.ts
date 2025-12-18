import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateReportBlocksFromMarkdownWithMeta } from '../backend/src/services/reportBlocksService';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

/**
 * Backfill report_blocks for existing report posts (research_report + market-gap).
 * Also stores generation metadata into report_runs (best effort) if that table exists.
 */
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const limit = Number(process.argv[2] || 25);

  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, content, body, post_type, report_blocks, created_at')
    .in('post_type', ['research_report', 'market-gap'])
    .is('report_blocks', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to query posts:', error.message);
    process.exit(1);
  }

  console.log(`Found ${posts?.length || 0} posts missing report_blocks`);
  for (const p of posts || []) {
    const body = String((p as any).body || '').trim();
    if (!body) {
      console.log(`skip ${p.id}: no markdown body`);
      continue;
    }

    try {
      const rb = await generateReportBlocksFromMarkdownWithMeta({
        markdown: body,
        fallbackTitle: String((p as any).content || '').slice(0, 120),
      });

      const { error: upErr } = await supabase
        .from('forum_posts')
        .update({ report_blocks: rb.doc, updated_at: new Date().toISOString() } as any)
        .eq('id', p.id);

      if (upErr) {
        console.error(`Failed updating post ${p.id}:`, upErr.message);
        continue;
      }

      // Best-effort metadata persistence (requires report_runs table)
      await supabase.from('report_runs').insert({
        post_id: p.id,
        report_kind: (p as any).post_type,
        status: 'success',
        model_name: rb.model_name,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        prompts: { report_blocks_prompt: rb.prompt },
        outputs: { report_blocks_raw_output: rb.raw_output, report_blocks_model: rb.model_name },
      } as any).catch(() => {});

      console.log(`✅ backfilled ${p.id}`);
    } catch (e: any) {
      console.error(`❌ failed ${p.id}:`, e?.message || String(e));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


