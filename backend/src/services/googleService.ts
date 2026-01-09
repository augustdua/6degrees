import crypto from 'crypto';
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import axios from 'axios';

type GoogleAuthMetadata = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  // Cached minimal phone->identity map to avoid refetching too often.
  contacts_cache?: {
    fetched_at?: string | null;
    entries?: Array<{ digits: string; displayName?: string | null; photoUrl?: string | null }>;
  };
};

type UserMetadata = {
  google?: GoogleAuthMetadata;
  [k: string]: any;
};

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToString(s: string) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

function getStateSecret() {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    'dev-google-oauth-state-secret'
  );
}

function makeOAuthState(userId: string) {
  const ts = Date.now();
  const nonce = crypto.randomBytes(12).toString('hex');
  const data = `${userId}.${ts}.${nonce}`;
  const sig = crypto.createHmac('sha256', getStateSecret()).update(data).digest('hex');
  const payload = { uid: userId, ts, nonce, sig };
  return base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
}

function parseAndVerifyOAuthState(state: string): { userId: string } {
  const raw = base64UrlDecodeToString(state);
  const payload = JSON.parse(raw) as any;
  const uid = String(payload?.uid || '');
  const ts = Number(payload?.ts || 0);
  const nonce = String(payload?.nonce || '');
  const sig = String(payload?.sig || '');
  if (!uid || !ts || !nonce || !sig) throw new Error('Invalid OAuth state');

  // 15 minute freshness window to reduce replay risk.
  if (Math.abs(Date.now() - ts) > 15 * 60 * 1000) throw new Error('Expired OAuth state');

  const data = `${uid}.${ts}.${nonce}`;
  const expected = crypto.createHmac('sha256', getStateSecret()).update(data).digest('hex');
  if (expected !== sig) throw new Error('Invalid OAuth state signature');
  return { userId: uid };
}

async function getUserMetadata(userId: string): Promise<UserMetadata> {
  const { data, error } = await supabase.from('users').select('metadata').eq('id', userId).single();
  if (error) throw error;
  return (data?.metadata as UserMetadata) || {};
}

async function setUserMetadata(userId: string, next: UserMetadata) {
  const { error } = await supabase.from('users').update({ metadata: next }).eq('id', userId);
  if (error) throw error;
}

async function patchGoogleMetadata(userId: string, patch: Partial<GoogleAuthMetadata>) {
  const existing = await getUserMetadata(userId);
  const next: UserMetadata = {
    ...(existing || {}),
    google: { ...(existing?.google || {}), ...(patch || {}) },
  };
  await setUserMetadata(userId, next);
}

function getGoogleOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getGoogleStatus(userId: string) {
  const meta = await getUserMetadata(userId);
  const g = meta?.google || {};
  const connected = Boolean(g?.refresh_token || g?.access_token);
  return {
    connected,
    hasRefreshToken: Boolean(g?.refresh_token),
    hasAccessToken: Boolean(g?.access_token),
    cacheFetchedAt: g?.contacts_cache?.fetched_at || null,
  };
}

export function getGoogleAuthUrl(userId: string, redirectUri: string) {
  const oauth2Client = getGoogleOAuth2Client(redirectUri);
  const state = makeOAuthState(userId);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/contacts.readonly',
      // Optional: minimal profile; not required for People API, but can help account selection.
      'openid',
      'email',
    ],
    state,
    include_granted_scopes: true,
  });
  return url;
}

export async function handleGoogleOAuthCallback(params: {
  code: string;
  state: string;
  redirectUri: string;
}) {
  const { userId } = parseAndVerifyOAuthState(params.state);
  const oauth2Client = getGoogleOAuth2Client(params.redirectUri);
  const { tokens } = await oauth2Client.getToken(params.code);

  // Google may not return refresh_token on subsequent consents; preserve existing if present.
  const existing = await getUserMetadata(userId);
  const prev = existing?.google || {};
  await patchGoogleMetadata(userId, {
    access_token: tokens.access_token || prev.access_token || null,
    refresh_token: tokens.refresh_token || prev.refresh_token || null,
    expiry_date: typeof tokens.expiry_date === 'number' ? tokens.expiry_date : prev.expiry_date || null,
  });

  return { userId };
}

async function ensureValidAccessToken(userId: string, redirectUri: string) {
  const meta = await getUserMetadata(userId);
  const g = meta?.google || {};
  const oauth2Client = getGoogleOAuth2Client(redirectUri);
  oauth2Client.setCredentials({
    access_token: g?.access_token || undefined,
    refresh_token: g?.refresh_token || undefined,
    expiry_date: typeof g?.expiry_date === 'number' ? g.expiry_date : undefined,
  });

  // This will refresh if needed when refresh_token exists.
  const tokenResp = await oauth2Client.getAccessToken();
  const accessToken = tokenResp?.token || g?.access_token || null;

  // Persist updated access token if changed.
  if (accessToken && accessToken !== g?.access_token) {
    await patchGoogleMetadata(userId, { access_token: accessToken });
  }
  return { oauth2Client, accessToken };
}

function normalizeDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

function chooseBestName(displayName?: string | null): string | null {
  const n = String(displayName || '').trim();
  return n ? n : null;
}

export async function fetchGoogleContactsCache(userId: string, redirectUri: string, opts?: { force?: boolean }) {
  const meta = await getUserMetadata(userId);
  const cache = meta?.google?.contacts_cache;
  const fetchedAt = cache?.fetched_at ? Date.parse(String(cache.fetched_at)) : 0;
  const fresh = fetchedAt > 0 && Date.now() - fetchedAt < 24 * 60 * 60 * 1000;
  if (!opts?.force && fresh && Array.isArray(cache?.entries)) {
    return cache.entries!;
  }

  const { oauth2Client } = await ensureValidAccessToken(userId, redirectUri);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  const entries: Array<{ digits: string; displayName?: string | null; photoUrl?: string | null }> = [];
  let pageToken: string | undefined;
  const maxPages = 10; // up to 10k with pageSize 1000
  let pages = 0;

  while (pages < maxPages) {
    pages += 1;
    const resp = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken,
      personFields: 'names,phoneNumbers,photos',
    });

    const connections = resp.data.connections || [];
    for (const p of connections) {
      const displayName = chooseBestName(p.names?.[0]?.displayName);
      const photoUrl = p.photos?.find((ph) => ph.default || ph.metadata?.primary)?.url || p.photos?.[0]?.url || null;
      const nums = p.phoneNumbers || [];
      for (const ph of nums) {
        const raw = String(ph.canonicalForm || ph.value || '');
        const digits = normalizeDigits(raw);
        if (!digits) continue;
        entries.push({ digits, displayName, photoUrl });
      }
    }

    pageToken = resp.data.nextPageToken || undefined;
    if (!pageToken) break;
  }

  await patchGoogleMetadata(userId, {
    contacts_cache: { fetched_at: new Date().toISOString(), entries },
  });

  return entries;
}

export async function disconnectGoogle(userId: string) {
  await patchGoogleMetadata(userId, {
    access_token: null,
    refresh_token: null,
    expiry_date: null,
    contacts_cache: { fetched_at: null, entries: [] },
  });
  return { ok: true };
}

export async function enrichWithGoogleContacts(
  userId: string,
  redirectUri: string,
  waContacts: Array<{ jid: string; phone?: string | null; name?: string | null; profilePictureUrl?: string | null }>
) {
  const status = await getGoogleStatus(userId);
  if (!status.connected) return waContacts;

  const entries = await fetchGoogleContactsCache(userId, redirectUri);
  const map = new Map<string, { displayName?: string | null; photoUrl?: string | null }>();

  for (const e of entries) {
    const digits = normalizeDigits(e.digits);
    if (!digits) continue;
    if (!map.has(digits)) map.set(digits, { displayName: e.displayName || null, photoUrl: e.photoUrl || null });
    // Also index by last-10 for fuzzy matching
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      if (!map.has(last10)) map.set(last10, { displayName: e.displayName || null, photoUrl: e.photoUrl || null });
    }
  }

  return waContacts.map((c) => {
    const digits = normalizeDigits(c.phone || c.jid.split('@')[0]);
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const g = map.get(digits) || map.get(last10);
    if (!g) return c;

    const googleName = chooseBestName(g.displayName);
    const googlePhotoUrl = g.photoUrl || null;
    return {
      ...c,
      // Prefer Google (your address book) over WhatsApp pushName.
      name: googleName || c.name || null,
      profilePictureUrl: c.profilePictureUrl || googlePhotoUrl,
      googleName: googleName,
      googlePhotoUrl: googlePhotoUrl,
    } as any;
  });
}

export async function enrichWithGoogleAccessToken(
  accessToken: string,
  waContacts: Array<{ jid: string; phone?: string | null; name?: string | null; profilePictureUrl?: string | null }>
) {
  const token = String(accessToken || '').trim();
  if (!token) return waContacts;

  const entries: Array<{ digits: string; displayName?: string | null; photoUrl?: string | null }> = [];
  let pageToken: string | undefined;
  const maxPages = 10;
  let pages = 0;

  while (pages < maxPages) {
    pages += 1;
    const url = 'https://people.googleapis.com/v1/people/me/connections';
    const params: any = {
      pageSize: 1000,
      personFields: 'names,phoneNumbers,photos',
    };
    if (pageToken) params.pageToken = pageToken;

    const resp = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
      validateStatus: () => true,
    });

    if (resp.status === 401 || resp.status === 403) {
      // Token missing scopes/expired; fall back to WhatsApp-only.
      return waContacts;
    }
    if (resp.status < 200 || resp.status >= 300) {
      // Best-effort: don't break WA flow.
      return waContacts;
    }

    const data = resp.data || {};
    const connections = Array.isArray(data?.connections) ? data.connections : [];
    for (const p of connections) {
      const displayName = chooseBestName(p?.names?.[0]?.displayName);
      const photoUrl =
        p?.photos?.find?.((ph: any) => ph?.default || ph?.metadata?.primary)?.url ||
        p?.photos?.[0]?.url ||
        null;
      const nums = Array.isArray(p?.phoneNumbers) ? p.phoneNumbers : [];
      for (const ph of nums) {
        const raw = String(ph?.canonicalForm || ph?.value || '');
        const digits = normalizeDigits(raw);
        if (!digits) continue;
        entries.push({ digits, displayName, photoUrl });
      }
    }

    pageToken = typeof data?.nextPageToken === 'string' ? data.nextPageToken : undefined;
    if (!pageToken) break;
  }

  const map = new Map<string, { displayName?: string | null; photoUrl?: string | null }>();
  for (const e of entries) {
    const digits = normalizeDigits(e.digits);
    if (!digits) continue;
    if (!map.has(digits)) map.set(digits, { displayName: e.displayName || null, photoUrl: e.photoUrl || null });
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      if (!map.has(last10)) map.set(last10, { displayName: e.displayName || null, photoUrl: e.photoUrl || null });
    }
  }

  return waContacts.map((c) => {
    const digits = normalizeDigits(c.phone || c.jid.split('@')[0]);
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const g = map.get(digits) || map.get(last10);
    if (!g) return c;
    const googleName = chooseBestName(g.displayName);
    const googlePhotoUrl = g.photoUrl || null;
    return {
      ...c,
      name: googleName || c.name || null,
      profilePictureUrl: c.profilePictureUrl || googlePhotoUrl,
      googleName,
      googlePhotoUrl,
    } as any;
  });
}


