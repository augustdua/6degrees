import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Pull last 50 news posts
  const { data: rows, error } = await supabase
    .from('forum_posts')
    .select('id, content, news_url, news_source, news_published_at, created_at, post_type')
    .eq('post_type', 'news')
    .eq('is_deleted', false)
    .not('news_url', 'is', null)
    .order('news_published_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const list = rows || [];
  console.log(`Found ${list.length} stored news posts (latest 50).`);

  const bySource: Record<string, number> = {};
  for (const r of list) {
    const src = String((r as any).news_source || 'unknown').trim() || 'unknown';
    bySource[src] = (bySource[src] || 0) + 1;
  }
  console.log('Source breakdown:', bySource);

  console.log('\nTop 10 latest:');
  list.slice(0, 10).forEach((r: any, idx: number) => {
    console.log(
      `${idx + 1}. ${String(r.news_source || 'News')} | ${String(r.news_published_at || r.created_at)} | ${String(r.content || '').slice(0, 90)}`
    );
    console.log(`   ${String(r.news_url || '')}`);
  });

  // Quick “is Entrackr present?” heuristic
  const hasEntrackr = Object.keys(bySource).some((k) => k.toLowerCase().includes('entrackr'));
  console.log(`\nEntrackr present: ${hasEntrackr ? 'YES' : 'NO (check news_source values)'}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


