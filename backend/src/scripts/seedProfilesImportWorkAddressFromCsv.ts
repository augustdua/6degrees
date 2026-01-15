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

function isMeaningfulAddress(input: string | null | undefined): boolean {
  const v = String(input || '').trim().toLowerCase();
  if (!v) return false;
  // Common non-address placeholders in exports
  if (v === 'unknown' || v === 'n/a' || v === 'na' || v === '-' || v === 'none') return false;
  if (v === 'remote' || v === 'work from home' || v === 'wfh') return false;
  return true;
}

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

type MapboxFeature = {
  center?: [number, number]; // [lng, lat]
  place_type?: string[];
  relevance?: number;
};

function hasAnyPlaceType(placeTypes: string[] | undefined, allowed: string[]) {
  const set = new Set((placeTypes || []).map((s) => String(s || '').toLowerCase()));
  return allowed.some((a) => set.has(String(a).toLowerCase()));
}

async function geocodeMapbox(query: string, accessToken: string): Promise<GeocodeResult> {
  const q = String(query || '').trim();
  if (!q) return null;

  // Forward geocoding (v5). We restrict to address/poi to avoid broad "place" centroid results.
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('limit', '1');
  url.searchParams.set('autocomplete', 'false');
  url.searchParams.set('types', 'address,poi');
  url.searchParams.set('language', 'en');

  const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!resp.ok) {
    const err: any = new Error(`Mapbox geocode failed (${resp.status})`);
    err.status = resp.status;
    throw err;
  }

  const json = (await resp.json().catch(() => null)) as any;
  const f = (json?.features?.[0] || null) as MapboxFeature | null;
  const center = f?.center;
  if (!Array.isArray(center) || center.length < 2) return null;
  const lng = Number(center[0]);
  const lat = Number(center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Defensive: even with `types=address,poi`, keep a hard check.
  const pt = (f?.place_type || []).map((s) => String(s));
  if (!hasAnyPlaceType(pt, ['address', 'poi'])) return null;

  const precision = hasAnyPlaceType(pt, ['address']) ? 'address' : hasAnyPlaceType(pt, ['poi']) ? 'poi' : null;
  return { lat, lng, provider: 'mapbox', precision };
}

async function geocodeMapboxWithRetry(
  query: string,
  accessToken: string,
  opts: { retries: number; baseSleepMs: number }
): Promise<GeocodeResult> {
  const retries = Math.max(0, opts.retries);
  const baseSleepMs = Math.max(0, opts.baseSleepMs);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await geocodeMapbox(query, accessToken);
    } catch (e: any) {
      const status = Number(e?.status);
      const retryable = status === 429 || (status >= 500 && status <= 599);
      if (!retryable || attempt === retries) return null;
      await sleep(baseSleepMs * Math.pow(2, attempt));
    }
  }
  return null;
}

type GoogleGeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: { lat?: number; lng?: number };
      location_type?: string;
    };
    partial_match?: boolean;
  }>;
};

function isGoogleAcceptedLocationType(locationType: string | null | undefined) {
  // Be strict to avoid centroid pileups.
  // ROOFTOP: precise; RANGE_INTERPOLATED: street segment.
  const t = String(locationType || '').toUpperCase();
  return t === 'ROOFTOP' || t === 'RANGE_INTERPOLATED';
}

async function geocodeGoogle(query: string, apiKey: string, opts?: { countryBias?: string }) : Promise<GeocodeResult> {
  const q = String(query || '').trim();
  if (!q) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', q);
  url.searchParams.set('key', apiKey);
  // Bias results (doesn't restrict, but helps)
  if (opts?.countryBias) url.searchParams.set('components', `country:${opts.countryBias}`);

  const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!resp.ok) {
    const err: any = new Error(`Google geocode failed (${resp.status})`);
    err.status = resp.status;
    throw err;
  }

  const json = (await resp.json().catch(() => null)) as GoogleGeocodeResponse | null;
  if (!json || json.status !== 'OK' || !Array.isArray(json.results) || !json.results[0]) return null;

  const r = json.results[0];
  const lt = r.geometry?.location_type || null;
  if (!isGoogleAcceptedLocationType(lt)) return null;

  const lat = Number(r.geometry?.location?.lat);
  const lng = Number(r.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, provider: 'google', precision: String(lt).toLowerCase() };
}

async function geocodeGoogleWithRetry(
  query: string,
  apiKey: string,
  opts: { retries: number; baseSleepMs: number; countryBias?: string }
): Promise<GeocodeResult> {
  const retries = Math.max(0, opts.retries);
  const baseSleepMs = Math.max(0, opts.baseSleepMs);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await geocodeGoogle(query, apiKey, { countryBias: opts.countryBias });
    } catch (e: any) {
      const status = Number(e?.status);
      const retryable = status === 429 || (status >= 500 && status <= 599);
      if (!retryable || attempt === retries) return null;
      await sleep(baseSleepMs * Math.pow(2, attempt));
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  // Support positional args because some shells / npm invocations can drop `--flag` tokens.
  // Convention:
  //   1st positional number = geocodeSleepMs
  const positionalNums = args.filter((a) => a && !a.startsWith('-') && /^\d+$/.test(a)).map((a) => Number(a));
  const positionalGeocodeSleepMs = positionalNums.length >= 1 ? positionalNums[0] : undefined;

  const csvPathArg = getArg('--csv');
  const dryRun = args.includes('--dry-run');
  const prefer = (getArg('--match') || 'email').toLowerCase(); // email | linkedin | any
  const limit = getArg('--limit') ? Math.max(1, Number(getArg('--limit'))) : undefined;
  const doGeocode = args.includes('--geocode') || positionalGeocodeSleepMs !== undefined;
  const geocodeProvider = String(getArg('--geocode-provider') || '').trim().toLowerCase() || 'auto'; // auto | mapbox | google | nominatim
  const allowFallbackPlace = args.includes('--geocode-allow-fallback-place');
  const onlyMissingCoords = args.includes('--only-missing-coords');
  const geocodeRetries = getArg('--geocode-retries') ? Math.max(0, Number(getArg('--geocode-retries'))) : 3;
  const googleCountryBias = String(getArg('--google-country') || '').trim().toUpperCase() || 'IN';
  const geocodeSleepMs =
    getArg('--geocode-sleep-ms') !== null
      ? Math.max(0, Number(getArg('--geocode-sleep-ms')))
      : positionalGeocodeSleepMs !== undefined
        ? Math.max(0, positionalGeocodeSleepMs)
        : 1100;

  const csvPath = csvPathArg
    ? path.resolve(process.cwd(), csvPathArg)
    : path.resolve(process.cwd(), '..', 'LunchEOs-Contact-List-Default-view-export-1768463726148.csv');

  const rows = readCsvRows(csvPath);
  const sliced = limit ? rows.slice(0, limit) : rows;

  const geoCachePath = cachePathFor(csvPath);
  const geoCache = loadGeocodeCache(geoCachePath);
  const mapboxToken = String(process.env.MAPBOX_ACCESS_TOKEN || '').trim();
  const googleApiKey = String(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY || '').trim();
  const effectiveProvider =
    geocodeProvider === 'auto'
      ? mapboxToken
        ? 'mapbox'
        : googleApiKey
          ? 'google'
        : 'nominatim'
      : geocodeProvider;

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of sliced) {
    const email = normalizeEmail(r['Email'] || '');
    const linkedin = normalizeLinkedInUrl(r['Person Linkedin Url'] || '');
    const workAddress = String(r['Work Address'] || '').trim() || null;
    if (!workAddress || !isMeaningfulAddress(workAddress)) {
      skipped++;
      continue;
    }

    // Find seed profile id
    let seedId: string | null = null;
    let existingLat: number | null = null;
    let existingLng: number | null = null;

    const tryEmail = async () => {
      if (!email) return null;
      const q = await supabase
        .from('seed_profiles')
        .select('id, work_lat, work_lng')
        .eq('email', email)
        .in('status', ['unclaimed', 'claimed'])
        .maybeSingle();
      if (q.data?.id) {
        existingLat = typeof (q.data as any).work_lat === 'number' ? (q.data as any).work_lat : null;
        existingLng = typeof (q.data as any).work_lng === 'number' ? (q.data as any).work_lng : null;
        return String((q.data as any).id);
      }
      return null;
    };
    const tryLinkedin = async () => {
      if (!linkedin) return null;
      const q = await supabase
        .from('seed_profiles')
        .select('id, work_lat, work_lng')
        .eq('linkedin_url', linkedin)
        .in('status', ['unclaimed', 'claimed'])
        .maybeSingle();
      if (q.data?.id) {
        existingLat = typeof (q.data as any).work_lat === 'number' ? (q.data as any).work_lat : null;
        existingLng = typeof (q.data as any).work_lng === 'number' ? (q.data as any).work_lng : null;
        return String((q.data as any).id);
      }
      return null;
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

    if (onlyMissingCoords && typeof existingLat === 'number' && typeof existingLng === 'number') {
      // Already has coords; don't overwrite.
      continue;
    }

    let geo: GeocodeResult = null;
    if (doGeocode) {
      const geoKey = `${effectiveProvider}:${workAddress}`;
      if (geoKey in geoCache) {
        geo = geoCache[geoKey] ?? null;
      } else {
        // Best-effort geocode full work address first.
        const fallbackCity = String(r['Company City'] || '').trim() || String(r['City'] || '').trim() || '';
        const fallbackState = String(r['Company State'] || '').trim() || String(r['State'] || '').trim() || '';
        const fallbackCountry = String(r['Company Country'] || '').trim() || String(r['Country'] || '').trim() || '';

        if (effectiveProvider === 'mapbox') {
          if (!mapboxToken) {
            throw new Error('MAPBOX_ACCESS_TOKEN is required for --geocode-provider mapbox');
          }
          geo = await geocodeMapboxWithRetry(workAddress, mapboxToken, {
            retries: geocodeRetries,
            baseSleepMs: Math.max(200, geocodeSleepMs),
          });
          // Only if explicitly allowed, attempt a broad fallback (this can create centroid piles).
          if (!geo && allowFallbackPlace) {
            geo = await geocodeMapboxWithRetry([fallbackCity, fallbackState, fallbackCountry].filter(Boolean).join(', '), mapboxToken, {
              retries: geocodeRetries,
              baseSleepMs: Math.max(200, geocodeSleepMs),
            });
          }
        } else if (effectiveProvider === 'google') {
          if (!googleApiKey) {
            throw new Error('GOOGLE_MAPS_API_KEY (or GOOGLE_GEOCODING_API_KEY) is required for --geocode-provider google');
          }
          geo = await geocodeGoogleWithRetry(workAddress, googleApiKey, {
            retries: geocodeRetries,
            baseSleepMs: Math.max(200, geocodeSleepMs),
            countryBias: googleCountryBias,
          });
          // Only if explicitly allowed, attempt a broad fallback (can create centroid piles).
          if (!geo && allowFallbackPlace) {
            geo = await geocodeGoogleWithRetry([fallbackCity, fallbackState, fallbackCountry].filter(Boolean).join(', '), googleApiKey, {
              retries: geocodeRetries,
              baseSleepMs: Math.max(200, geocodeSleepMs),
              countryBias: googleCountryBias,
            });
          }
        } else {
          geo = await geocodeNominatim(workAddress);
          if (!geo && allowFallbackPlace) {
            geo = await geocodeNominatim([fallbackCity, fallbackState, fallbackCountry].filter(Boolean).join(', '));
          }
        }

        geoCache[geoKey] = geo;
        saveGeocodeCache(geoCachePath, geoCache);
        if (geocodeSleepMs) await sleep(geocodeSleepMs);
      }
    }

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


