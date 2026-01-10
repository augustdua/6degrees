import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { supabase } from '../config/supabase';

type GoogleAuthMetadata = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

type UserMetadata = {
  google?: GoogleAuthMetadata;
  [k: string]: any;
};

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

async function getAuthedClient(userId: string, redirectUri: string) {
  const meta = await getUserMetadata(userId);
  const g = meta?.google || {};
  if (!g?.refresh_token && !g?.access_token) {
    throw new Error('Google not connected');
  }

  const oauth2Client = getGoogleOAuth2Client(redirectUri);
  oauth2Client.setCredentials({
    access_token: g?.access_token || undefined,
    refresh_token: g?.refresh_token || undefined,
    expiry_date: typeof g?.expiry_date === 'number' ? g.expiry_date : undefined,
  });

  // Triggers refresh when refresh_token exists.
  const tokenResp = await oauth2Client.getAccessToken();
  const accessToken = tokenResp?.token || g?.access_token || null;
  if (accessToken && accessToken !== g?.access_token) {
    await patchGoogleMetadata(userId, { access_token: accessToken });
  }

  return oauth2Client;
}

export async function listGoogleCalendars(userId: string, redirectUri: string) {
  const auth = await getAuthedClient(userId, redirectUri);
  const cal = google.calendar({ version: 'v3', auth });
  const resp = await cal.calendarList.list({ maxResults: 50 });
  const items = resp.data.items || [];
  return items.map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: !!c.primary,
    accessRole: c.accessRole,
    timeZone: c.timeZone,
  }));
}

export async function listGoogleEvents(params: {
  userId: string;
  redirectUri: string;
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}) {
  const auth = await getAuthedClient(params.userId, params.redirectUri);
  const cal = google.calendar({ version: 'v3', auth });

  const timeMin = params.timeMin || new Date().toISOString();
  const maxResults = Math.min(Math.max(params.maxResults || 10, 1), 50);

  const resp = await cal.events.list({
    calendarId: params.calendarId,
    timeMin,
    timeMax: params.timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const items = resp.data.items || [];
  return items.map((e) => ({
    id: e.id,
    summary: e.summary,
    description: e.description,
    htmlLink: e.htmlLink,
    start: e.start,
    end: e.end,
    attendees: (e.attendees || []).map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
  }));
}

export async function createGoogleEvent(params: {
  userId: string;
  redirectUri: string;
  calendarId: string;
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
  };
}) {
  const auth = await getAuthedClient(params.userId, params.redirectUri);
  const cal = google.calendar({ version: 'v3', auth });

  const body: calendar_v3.Schema$Event = {
    summary: params.event.summary,
    description: params.event.description,
    location: params.event.location,
    start: params.event.start,
    end: params.event.end,
    attendees: params.event.attendees,
  };

  const resp = await cal.events.insert({
    calendarId: params.calendarId,
    requestBody: body,
    sendUpdates: 'none',
  });

  const e = resp.data;
  return {
    id: e.id,
    htmlLink: e.htmlLink,
    summary: e.summary,
    start: e.start,
    end: e.end,
  };
}


