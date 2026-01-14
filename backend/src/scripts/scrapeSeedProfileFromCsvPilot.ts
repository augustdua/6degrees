import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';
import { scrapeLinkedInProfilesViaApify } from '../services/apifyLinkedInService';

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser that supports quoted fields and commas inside quotes.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function readFirstCsvRow(csvPath: string): CsvRow {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error(`CSV has no data rows: ${csvPath}`);
  const header = parseCsvLine(lines[0]);
  const row = parseCsvLine(lines[1]);
  const out: CsvRow = {};
  for (let i = 0; i < header.length; i++) {
    out[header[i]] = row[i] ?? '';
  }
  return out;
}

function normalizeLinkedInUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  // Prefer https + www for consistency with our existing Apify pipeline (see ZaurqPartnersData/test_input_one.json).
  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.endsWith('linkedin.com')) return null;
    const pathname = url.pathname || '';
    if (!pathname.toLowerCase().includes('/in/')) return null;
    url.search = '';
    url.hash = '';
    url.protocol = 'https:';
    url.hostname = 'www.linkedin.com';
    // Ensure trailing slash for stability in the actor.
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function parseMonthYearToDate(mmyyyy: string, which: 'start' | 'end'): string | null {
  // Apify sometimes returns "5-2020" (M-YYYY) or "05-2020".
  const s = String(mmyyyy || '').trim();
  const m = s.match(/^(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const month = Math.max(1, Math.min(12, Number(m[1])));
  const year = Number(m[2]);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;

  if (which === 'start') {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  // end: choose the last day of month for nicer range queries
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

  // Best-effort exact match by lower(name)
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .ilike('name', n)
    .limit(1)
    .maybeSingle();

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

async function main() {
  const csvPath = path.resolve(process.cwd(), '..', 'LunchEOsCSV.csv');
  const row = readFirstCsvRow(csvPath);

  const email = String(row['Email'] || '').trim() || null;
  const linkedinRaw = String(row['Person Linkedin Url'] || '').trim();
  const linkedinUrl = normalizeLinkedInUrl(linkedinRaw);

  if (!linkedinUrl) {
    throw new Error(`Invalid LinkedIn URL in first row: ${linkedinRaw}`);
  }

  console.log('[pilot] CSV row:', {
    firstName: row['First Name'],
    lastName: row['Last Name'],
    email,
    linkedinUrl,
  });

  console.log('[pilot] Starting Apify scrape...');
  const candidateUrls = Array.from(
    new Set([
      linkedinUrl,
      linkedinUrl.replace('https://www.linkedin.com', 'https://linkedin.com'),
      linkedinUrl.replace('https://www.linkedin.com', 'https://www.linkedin.com').replace(/\/+$/, '/'),
    ])
  );

  let item: any = null;
  for (let attempt = 0; attempt < candidateUrls.length; attempt++) {
    const u = candidateUrls[attempt];
    const items = await scrapeLinkedInProfilesViaApify([u], { timeoutMs: 8 * 60_000 });
    item = Array.isArray(items) && items.length > 0 ? items[0] : null;
    if (item) break;
    console.warn(`[pilot] Apify returned 0 items for url=${u}`);
  }

  if (!item) throw new Error('No profile returned from Apify (empty dataset)');

  const scraped = pickSeedProfileFromApifyItem(item);
  const slugBase = scraped.publicIdentifier || slugify(scraped.fullName || '') || 'seed-profile';
  const slug = slugBase;

  const displayName = scraped.fullName || [scraped.firstName, scraped.lastName].filter(Boolean).join(' ').trim() || null;

  const enrichment = {
    linkedin: {
      lastScrapedAt: new Date().toISOString(),
      source: 'apify',
      profile: {
        fullName: scraped.fullName,
        headline: scraped.headline,
        about: scraped.about,
        location: scraped.location,
        linkedinUrl: scraped.linkedinUrl || linkedinUrl,
        profilePic: scraped.profilePic,
        publicIdentifier: scraped.publicIdentifier,
        linkedinId: scraped.linkedinId,
        followers: scraped.followers,
        connections: scraped.connections,
      },
    },
  };

  const source = {
    csv: {
      file: 'LunchEOsCSV.csv',
      rowIndex: 1,
      email: email,
    },
    importedAt: new Date().toISOString(),
  };

  console.log('[pilot] Upserting seed_profiles...');
  const { data: seed, error: upsertErr } = await supabase
    .from('seed_profiles')
    .upsert(
      {
        slug,
        email,
        first_name: scraped.firstName,
        last_name: scraped.lastName,
        display_name: displayName,
        headline: scraped.headline,
        bio: scraped.about || scraped.headline,
        location: scraped.location,
        linkedin_url: scraped.linkedinUrl || linkedinUrl,
        profile_picture_url: scraped.profilePic,
        enrichment,
        source,
        status: 'unclaimed',
      },
      { onConflict: 'slug' }
    )
    .select('id, slug')
    .single();

  if (upsertErr || !seed?.id) throw new Error(`seed_profiles upsert failed: ${upsertErr?.message || 'unknown error'}`);

  const seedProfileId = seed.id as string;

  console.log('[pilot] Inserting raw snapshot...');
  await supabase.from('seed_profile_scrape_snapshots').insert({
    seed_profile_id: seedProfileId,
    source: 'apify',
    raw: item,
  });

  console.log('[pilot] Mapping experiences -> organizations...');
  const experiences = Array.isArray(scraped.experiences) ? scraped.experiences : [];

  // Keep only entries that have a company name.
  const exps = experiences
    .filter((e: any) => e && typeof e.companyName === 'string' && e.companyName.trim().length > 0)
    .slice(0, 12);

  for (const e of exps) {
    const companyName = String(e.companyName || '').trim();
    const position = typeof e.title === 'string' ? e.title.trim() : null;
    const start_date = parseMonthYearToDate(e.jobStartedOn, 'start');
    const end_date = e.jobEndedOn ? parseMonthYearToDate(e.jobEndedOn, 'end') : null;
    const is_current = Boolean(e.jobStillWorking) || (!e.jobEndedOn && !end_date);
    const logo = typeof e.logo === 'string' ? e.logo : null;

    const orgId = await getOrCreateOrganizationId(companyName, logo);

    await supabase
      .from('seed_profile_organizations')
      .upsert(
        {
          seed_profile_id: seedProfileId,
          organization_id: orgId,
          position,
          start_date,
          end_date,
          is_current,
          logo_url: logo,
        },
        { onConflict: 'seed_profile_id,organization_id,position,start_date,end_date' }
      );
  }

  console.log('[pilot] Done.');
  console.log(`[pilot] seed_profile slug=${slug}`);
  console.log(`[pilot] Public URL should be: /p/${encodeURIComponent(slug)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


