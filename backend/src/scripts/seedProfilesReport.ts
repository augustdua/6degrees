import { supabase } from '../config/supabase';

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function main() {
  const total = await count('seed_profiles', (q) => q.in('status', ['unclaimed', 'claimed', 'disabled']));
  const enabled = await count('seed_profiles', (q) => q.in('status', ['unclaimed', 'claimed']));
  const disabled = await count('seed_profiles', (q) => q.eq('status', 'disabled'));

  // “Enriched” = has enrichment.linkedin.lastScrapedAt
  const enriched = await count('seed_profiles', (q) => q.not('enrichment->linkedin->>lastScrapedAt', 'is', null));
  const withPic = await count('seed_profiles', (q) => q.not('profile_picture_url', 'is', null));
  const withBio = await count('seed_profiles', (q) => q.not('bio', 'is', null));

  const orgLinks = await count('seed_profile_organizations');
  const snapshots = await count('seed_profile_scrape_snapshots');

  console.log('=== seed_profiles report ===');
  console.log({ total, enabled, disabled, enriched, withPic, withBio, orgLinks, snapshots });

  const { data: sample, error } = await supabase
    .from('seed_profiles')
    .select('slug, display_name, linkedin_url, status, enrichment')
    .in('status', ['unclaimed', 'claimed'])
    .order('updated_at', { ascending: false })
    .limit(5);
  if (error) throw error;

  console.log('\n=== sample (latest 5) ===');
  for (const r of sample || []) {
    const last = (r as any)?.enrichment?.linkedin?.lastScrapedAt || null;
    console.log({
      slug: (r as any).slug,
      name: (r as any).display_name,
      status: (r as any).status,
      linkedin: (r as any).linkedin_url,
      lastScrapedAt: last,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


