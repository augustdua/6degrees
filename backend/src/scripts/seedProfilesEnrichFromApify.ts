import { supabase } from '../config/supabase';
import { scrapeLinkedInProfilesViaApify } from '../services/apifyLinkedInService';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseMonthYearToDate(mmyyyy: string, which: 'start' | 'end'): string | null {
  const s = String(mmyyyy || '').trim();
  const m = s.match(/^(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const month = Math.max(1, Math.min(12, Number(m[1])));
  const year = Number(m[2]);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;

  if (which === 'start') return `${year}-${String(month).padStart(2, '0')}-01`;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstOfNext = new Date(Date.UTC(nextYear, nextMonth - 1, 1));
  const lastOfMonth = new Date(firstOfNext.getTime() - 24 * 60 * 60 * 1000);
  const d = lastOfMonth.getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function getOrCreateOrganizationId(name: string, logoUrl?: string | null): Promise<string> {
  const n = String(name || '').trim();
  if (!n) throw new Error('Missing organization name');

  const { data: existing } = await supabase.from('organizations').select('id').ilike('name', n).limit(1).maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: inserted, error } = await supabase
    .from('organizations')
    .insert({ name: n, logo_url: logoUrl || null })
    .select('id')
    .single();

  if (error || !inserted?.id) throw new Error(`Failed to insert organization "${n}": ${error?.message || 'unknown error'}`);
  return inserted.id as string;
}

function pickSeedProfileFromApifyItem(item: any) {
  const firstName = typeof item?.firstName === 'string' ? item.firstName.trim() : '';
  const lastName = typeof item?.lastName === 'string' ? item.lastName.trim() : '';
  const fullName = typeof item?.fullName === 'string' ? item.fullName.trim() : `${firstName} ${lastName}`.trim();

  const headline = typeof item?.headline === 'string' ? item.headline.trim() : null;
  const about = typeof item?.about === 'string' ? item.about.trim() : null;
  const location = typeof item?.addressWithCountry === 'string' ? item.addressWithCountry.trim() : null;

  const profilePic =
    (typeof item?.profilePicHighQuality === 'string' && item.profilePicHighQuality) ||
    (typeof item?.profilePic === 'string' && item.profilePic) ||
    null;

  const linkedinUrl =
    (typeof item?.linkedinPublicUrl === 'string' && item.linkedinPublicUrl) ||
    (typeof item?.linkedinUrl === 'string' && item.linkedinUrl) ||
    null;

  const publicIdentifier = typeof item?.publicIdentifier === 'string' ? item.publicIdentifier.trim() : null;
  const linkedinId = typeof item?.linkedinId === 'string' ? item.linkedinId.trim() : null;

  const followers = Number.isFinite(Number(item?.followers)) ? Number(item.followers) : null;
  const connections = Number.isFinite(Number(item?.connections)) ? Number(item.connections) : null;

  const experiences = Array.isArray(item?.experiences) ? item.experiences : [];

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    fullName: fullName || null,
    headline,
    about,
    location,
    linkedinUrl,
    profilePic,
    publicIdentifier,
    linkedinId,
    followers,
    connections,
    experiences,
  };
}

type SeedRow = {
  id: string;
  slug: string;
  linkedin_url: string | null;
  enrichment: any;
};

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  // Support BOTH flag-style args and positional args.
  // Positional convention:
  //   1st = limit, 2nd = batchSize, 3rd = sleepMs
  const posNums = args.filter((a) => a && !a.startsWith('-') && /^\d+$/.test(a)).map((a) => Number(a));
  const positionalLimit = posNums.length >= 1 ? posNums[0] : undefined;
  const positionalBatch = posNums.length >= 2 ? posNums[1] : undefined;
  const positionalSleep = posNums.length >= 3 ? posNums[2] : undefined;

  const batchSize = Math.max(1, Math.min(25, Number(getArg('--batch-size') || (positionalBatch ?? 10))));
  const limit = getArg('--limit') ? Number(getArg('--limit')!) : positionalLimit ?? 25;
  const sleepMs = Math.max(0, Number(getArg('--sleep-ms') || (positionalSleep ?? 1500)));
  const force = args.includes('--force');

  console.log(`[enrich] batchSize=${batchSize} limit=${limit} sleepMs=${sleepMs} force=${force}`);

  // Fetch a window of seed_profiles; filter for those needing enrichment.
  const { data, error } = await supabase
    .from('seed_profiles')
    .select('id, slug, linkedin_url, enrichment')
    .in('status', ['unclaimed', 'claimed'])
    .order('created_at', { ascending: true })
    .limit(Math.max(50, limit * 2));

  if (error) throw error;

  const rows: SeedRow[] = (data || []) as any;
  const needs = rows
    .filter((r) => r.linkedin_url)
    .filter((r) => {
      const last = (r.enrichment as any)?.linkedin?.lastScrapedAt;
      return force ? true : !last;
    })
    .slice(0, limit);

  console.log(`[enrich] candidates=${rows.length} toProcess=${needs.length}`);
  if (needs.length === 0) return;

  for (let i = 0; i < needs.length; i += batchSize) {
    const batch = needs.slice(i, i + batchSize);
    const urls = batch.map((b) => String(b.linkedin_url));

    console.log(`[enrich] batch ${Math.floor(i / batchSize) + 1} urls=${urls.length}`);

    const items = await scrapeLinkedInProfilesViaApify(urls, { timeoutMs: 15 * 60_000 });
    if (!Array.isArray(items) || items.length === 0) {
      console.warn('[enrich] Apify returned 0 items for batch; continuing');
      if (sleepMs) await sleep(sleepMs);
      continue;
    }

    const normalize = (u: string) =>
      String(u || '')
        .trim()
        .replace(/^http:\/\//i, 'https://')
        .replace(/^https:\/\/linkedin\.com/i, 'https://www.linkedin.com')
        .replace(/\/+$/, '');

    // Best-effort map: by normalized linkedinPublicUrl/linkedinUrl
    const byUrl = new Map<string, any>();
    const byPublicId = new Map<string, any>();
    for (const it of items) {
      const u = (typeof it?.linkedinPublicUrl === 'string' && it.linkedinPublicUrl) || (typeof it?.linkedinUrl === 'string' && it.linkedinUrl) || null;
      if (u) byUrl.set(normalize(u), it);
      const pid = typeof it?.publicIdentifier === 'string' ? String(it.publicIdentifier).trim() : '';
      if (pid) byPublicId.set(pid, it);
    }

    for (const seed of batch) {
      const inputUrl = normalize(String(seed.linkedin_url || ''));
      const slug = String(seed.slug || '').trim();
      const item =
        byUrl.get(inputUrl) ||
        // Many of your slugs are the LinkedIn public identifier; use it if present.
        byPublicId.get(slug) ||
        null;

      if (!item) {
        console.warn(`[enrich] no item matched slug=${seed.slug}`);
        continue;
      }

      const scraped = pickSeedProfileFromApifyItem(item);
      const displayName = scraped.fullName || [scraped.firstName, scraped.lastName].filter(Boolean).join(' ').trim() || null;

      const enrichment = {
        ...(seed.enrichment && typeof seed.enrichment === 'object' ? seed.enrichment : {}),
        linkedin: {
          lastScrapedAt: new Date().toISOString(),
          source: 'apify',
          profile: {
            fullName: scraped.fullName,
            headline: scraped.headline,
            about: scraped.about,
            location: scraped.location,
            linkedinUrl: scraped.linkedinUrl || seed.linkedin_url,
            profilePic: scraped.profilePic,
            publicIdentifier: scraped.publicIdentifier,
            linkedinId: scraped.linkedinId,
            followers: scraped.followers,
            connections: scraped.connections,
            experiences: Array.isArray(scraped.experiences) ? scraped.experiences.slice(0, 12) : [],
          },
        },
      };

      const { error: upErr } = await supabase
        .from('seed_profiles')
        .update({
          first_name: scraped.firstName,
          last_name: scraped.lastName,
          display_name: displayName,
          headline: scraped.headline,
          bio: scraped.about || scraped.headline,
          location: scraped.location,
          profile_picture_url: scraped.profilePic,
          linkedin_url: scraped.linkedinUrl || seed.linkedin_url,
          enrichment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seed.id);

      if (upErr) {
        console.warn(`[enrich] update failed slug=${seed.slug}: ${upErr.message}`);
        continue;
      }

      // Store raw snapshot (private)
      await supabase.from('seed_profile_scrape_snapshots').insert({
        seed_profile_id: seed.id,
        source: 'apify',
        raw: item,
      });

      // Map experiences -> organizations + seed_profile_organizations
      const exps = Array.isArray(scraped.experiences) ? scraped.experiences : [];
      const expRows = exps
        .filter((e: any) => e && typeof e.companyName === 'string' && e.companyName.trim().length > 0)
        .slice(0, 12);

      for (const e of expRows) {
        const companyName = String(e.companyName || '').trim();
        const position = typeof e.title === 'string' ? e.title.trim() : null;
        const start_date = parseMonthYearToDate(e.jobStartedOn, 'start');
        const end_date = e.jobEndedOn ? parseMonthYearToDate(e.jobEndedOn, 'end') : null;
        const is_current = Boolean(e.jobStillWorking) || (!e.jobEndedOn && !end_date);
        const logo = typeof e.logo === 'string' ? e.logo : null;

        try {
          const orgId = await getOrCreateOrganizationId(companyName, logo);
          await supabase
            .from('seed_profile_organizations')
            .upsert(
              {
                seed_profile_id: seed.id,
                organization_id: orgId,
                position,
                start_date,
                end_date,
                is_current,
                logo_url: logo,
              },
              { onConflict: 'seed_profile_id,organization_id,position,start_date,end_date' }
            );
        } catch (e2: any) {
          console.warn(`[enrich] org mapping failed slug=${seed.slug} company=${companyName}: ${e2?.message || e2}`);
        }
      }
    }

    if (sleepMs) await sleep(sleepMs);
  }

  console.log('[enrich] done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


