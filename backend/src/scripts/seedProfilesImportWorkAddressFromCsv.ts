import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
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

function normalizeEmail(input: string): string | null {
  const e = String(input || '').trim().toLowerCase();
  if (!e) return null;
  if (!e.includes('@')) return null;
  return e;
}

function normalizeLinkedInUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
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
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    return null;
  }
}

function readCsvRows(csvPath: string): CsvRow[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const out: CsvRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]).map((v) => v.replace(/^"|"$/g, ''));
    const obj: CsvRow = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = row[i] ?? '';
    out.push(obj);
  }
  return out;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type GeocodeResult = { lat: number; lng: number; provider: string; precision?: string | null } | null;

function cachePathFor(csvPath: string) {
  // Cache by filename to allow multiple contact list exports.
  const base = path.basename(csvPath).replace(/[^a-z0-9._-]+/gi, '_');
  return path.resolve(process.cwd(), '.cache', `work-address-geocode.${base}.json`);
}

function loadGeocodeCache(p: string): Record<string, GeocodeResult> {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as any;
  } catch {
    return {};
  }
}

function saveGeocodeCache(p: string, data: Record<string, GeocodeResult>) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

async function geocodeNominatim(query: string): Promise<GeocodeResult> {
  const q = String(query || '').trim();
  if (!q) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', q);

  const resp = await fetch(url.toString(), {
    headers: {
      // Nominatim requires a descriptive UA.
      'User-Agent': '6Degrees seed profile work address importer (contact: ops@zaurq.com)',
      Accept: 'application/json',
    },
  });
  if (!resp.ok) return null;
  const json = (await resp.json().catch(() => null)) as any;
  if (!Array.isArray(json) || !json[0]) return null;
  const lat = Number(json[0].lat);
  const lng = Number(json[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, provider: 'nominatim', precision: String(json[0].type || '') || null };
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  const csvPathArg = getArg('--csv');
  const dryRun = args.includes('--dry-run');
  const prefer = (getArg('--match') || 'email').toLowerCase(); // email | linkedin | any
  const limit = getArg('--limit') ? Math.max(1, Number(getArg('--limit'))) : undefined;
  const doGeocode = args.includes('--geocode');
  const geocodeSleepMs = getArg('--geocode-sleep-ms') ? Math.max(0, Number(getArg('--geocode-sleep-ms'))) : 1100;

  const csvPath = csvPathArg
    ? path.resolve(process.cwd(), csvPathArg)
    : path.resolve(process.cwd(), '..', 'LunchEOs-Contact-List-Default-view-export-1768463726148.csv');

  const rows = readCsvRows(csvPath);
  const sliced = limit ? rows.slice(0, limit) : rows;

  const geoCachePath = cachePathFor(csvPath);
  const geoCache = loadGeocodeCache(geoCachePath);

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of sliced) {
    const email = normalizeEmail(r['Email'] || '');
    const linkedin = normalizeLinkedInUrl(r['Person Linkedin Url'] || '');
    const workAddress = String(r['Work Address'] || '').trim() || null;
    if (!workAddress) {
      skipped++;
      continue;
    }

    let geo: GeocodeResult = null;
    if (doGeocode) {
      const geoKey = workAddress;
      if (geoKey in geoCache) {
        geo = geoCache[geoKey] ?? null;
      } else {
        // Best-effort geocode full work address first; fall back to company city/state/country.
        const fallbackCity =
          String(r['Company City'] || '').trim() ||
          String(r['City'] || '').trim() ||
          '';
        const fallbackState =
          String(r['Company State'] || '').trim() ||
          String(r['State'] || '').trim() ||
          '';
        const fallbackCountry =
          String(r['Company Country'] || '').trim() ||
          String(r['Country'] || '').trim() ||
          '';

        geo =
          (await geocodeNominatim(workAddress)) ||
          (await geocodeNominatim([fallbackCity, fallbackState, fallbackCountry].filter(Boolean).join(', ')));
        geoCache[geoKey] = geo;
        saveGeocodeCache(geoCachePath, geoCache);
        if (geocodeSleepMs) await sleep(geocodeSleepMs);
      }
    }

    // Find seed profile id
    let seedId: string | null = null;

    const tryEmail = async () => {
      if (!email) return null;
      const q = await supabase.from('seed_profiles').select('id').eq('email', email).in('status', ['unclaimed', 'claimed']).maybeSingle();
      return q.data?.id ? String(q.data.id) : null;
    };
    const tryLinkedin = async () => {
      if (!linkedin) return null;
      const q = await supabase.from('seed_profiles').select('id').eq('linkedin_url', linkedin).in('status', ['unclaimed', 'claimed']).maybeSingle();
      return q.data?.id ? String(q.data.id) : null;
    };

    if (prefer === 'email') {
      seedId = await tryEmail();
      if (!seedId) seedId = await tryLinkedin();
    } else if (prefer === 'linkedin') {
      seedId = await tryLinkedin();
      if (!seedId) seedId = await tryEmail();
    } else {
      seedId = (await tryEmail()) || (await tryLinkedin());
    }

    if (!seedId) {
      skipped++;
      continue;
    }
    matched++;

    if (dryRun) continue;

    const { error } = await supabase
      .from('seed_profiles')
      .update({
        work_address: workAddress,
        // also set `location` if missing (so list sorting works nicely)
        location: (r['City'] || '').trim() || (r['Company City'] || '').trim() || null,
        ...(geo
          ? {
              work_lat: geo.lat,
              work_lng: geo.lng,
              work_geocoded_at: new Date().toISOString(),
              work_geocode_provider: geo.provider,
              work_geocode_precision: geo.precision || null,
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', seedId);

    if (error) {
      console.warn(`[work-address] update failed seedId=${seedId}: ${error.message}`);
      continue;
    }
    updated++;
  }

  console.log(`[work-address] rows=${sliced.length} matched=${matched} updated=${updated} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


