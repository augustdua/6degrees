import { supabase } from '../config/supabase';
import { fetchGoogleContactsCache, getGoogleStatus } from './googleService';

type BirthdayRow = {
  owner_id: string;
  resource_name: string;
  display_name: string | null;
  photo_url: string | null;
  primary_email: string | null;
  primary_phone_digits: string | null;
  birthday_month: number;
  birthday_day: number;
  birthday_year: number | null;
  source: string;
  updated_at: string;
};

function normalizeDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

function computeNextOccurrenceISO(month: number, day: number): { nextIso: string; daysUntil: number } {
  // Compute in UTC to keep it stable across server tz.
  const now = new Date();
  const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const y = now.getUTCFullYear();
  const thisYear = Date.UTC(y, month - 1, day);
  const nextYear = Date.UTC(y + 1, month - 1, day);
  const target = thisYear >= nowUtcMidnight ? thisYear : nextYear;

  const daysUntil = Math.floor((target - nowUtcMidnight) / (24 * 60 * 60 * 1000));
  return { nextIso: new Date(target).toISOString(), daysUntil };
}

export async function syncGoogleBirthdays(userId: string, redirectUri: string, opts?: { force?: boolean }) {
  const status = await getGoogleStatus(userId);
  if (!status.connected) throw new Error('Google not connected');

  const entries = await fetchGoogleContactsCache(userId, redirectUri, { force: !!opts?.force });
  const byResource = new Map<
    string,
    {
      displayName: string | null;
      photoUrl: string | null;
      primaryEmail: string | null;
      primaryPhoneDigits: string | null;
      month: number;
      day: number;
      year: number | null;
    }
  >();

  for (const e of entries as any[]) {
    const resourceName = typeof e?.resourceName === 'string' ? String(e.resourceName) : '';
    const b = e?.birthday;
    const month = typeof b?.month === 'number' ? b.month : null;
    const day = typeof b?.day === 'number' ? b.day : null;
    const year = typeof b?.year === 'number' ? b.year : null;
    if (!resourceName) continue;
    if (!month || !day) continue;

    if (byResource.has(resourceName)) continue;

    const displayName = typeof e?.displayName === 'string' ? String(e.displayName).trim() : '';
    const photoUrl = typeof e?.photoUrl === 'string' ? String(e.photoUrl) : null;
    const emails = Array.isArray(e?.emails) ? e.emails.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
    const digitsRaw = typeof e?.digits === 'string' ? String(e.digits) : '';
    const digits = digitsRaw ? normalizeDigits(digitsRaw) : '';

    byResource.set(resourceName, {
      displayName: displayName || null,
      photoUrl: photoUrl || null,
      primaryEmail: emails[0] || null,
      primaryPhoneDigits: digits || null,
      month,
      day,
      year,
    });
  }

  const nowIso = new Date().toISOString();
  const rows: BirthdayRow[] = Array.from(byResource.entries()).map(([resource_name, v]) => ({
    owner_id: userId,
    resource_name,
    display_name: v.displayName,
    photo_url: v.photoUrl,
    primary_email: v.primaryEmail,
    primary_phone_digits: v.primaryPhoneDigits,
    birthday_month: v.month,
    birthday_day: v.day,
    birthday_year: v.year,
    source: 'google_people',
    updated_at: nowIso,
  }));

  if (rows.length === 0) {
    return { ok: true, upserted: 0 };
  }

  const { error } = await supabase.from('contact_birthdays').upsert(rows as any, {
    onConflict: 'owner_id,resource_name',
  });
  if (error) throw error;

  return { ok: true, upserted: rows.length };
}

export async function getUpcomingBirthdays(userId: string, opts?: { days?: number; limit?: number }) {
  const days = Math.min(Math.max(opts?.days || 14, 1), 90);
  const limit = Math.min(Math.max(opts?.limit || 8, 1), 20);

  const { data, error } = await supabase
    .from('contact_birthdays')
    .select('resource_name, display_name, photo_url, birthday_month, birthday_day, birthday_year')
    .eq('owner_id', userId)
    .limit(5000);
  if (error) throw error;

  const list = Array.isArray(data) ? data : [];
  const upcoming = list
    .map((r: any) => {
      const month = Number(r.birthday_month);
      const day = Number(r.birthday_day);
      if (!month || !day) return null;
      const { nextIso, daysUntil } = computeNextOccurrenceISO(month, day);
      return {
        resourceName: String(r.resource_name),
        displayName: (r.display_name ? String(r.display_name) : 'Unknown').trim() || 'Unknown',
        photoUrl: r.photo_url ? String(r.photo_url) : null,
        birthdayMonth: month,
        birthdayDay: day,
        birthdayYear: r.birthday_year ? Number(r.birthday_year) : null,
        nextOccurrenceIso: nextIso,
        daysUntil,
      };
    })
    .filter(Boolean)
    .filter((x: any) => x.daysUntil >= 0 && x.daysUntil <= days)
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
    .slice(0, limit);

  return { ok: true, days, upcoming };
}


