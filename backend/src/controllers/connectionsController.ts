import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

function computeNextOccurrenceISO(month: number, day: number): { nextIso: string; daysUntil: number } {
  const now = new Date();
  const nowUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const y = now.getUTCFullYear();
  const thisYear = Date.UTC(y, month - 1, day);
  const nextYear = Date.UTC(y + 1, month - 1, day);
  const target = thisYear >= nowUtcMidnight ? thisYear : nextYear;
  const daysUntil = Math.floor((target - nowUtcMidnight) / (24 * 60 * 60 * 1000));
  return { nextIso: new Date(target).toISOString(), daysUntil };
}

export const getUserConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase.rpc('get_user_connections', { p_user_id: userId });

    if (error) {
      console.error('Error fetching user connections:', error);
      res.status(500).json({ error: 'Failed to fetch user connections' });
      return;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getUserConnections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Search connections by name
 */
export const searchConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const searchQuery = (req.query.q as string || '').trim();
    
    if (searchQuery.length < 2) {
      res.json({ connections: [] });
      return;
    }

    console.log('🔍 Searching connections for user:', userId, 'query:', searchQuery);

    // Get connections where current user is user1
    const { data: data1 } = await supabase
      .from('user_connections')
      .select('user2_id')
      .eq('user1_id', userId)
      .eq('status', 'connected');

    // Get connections where current user is user2
    const { data: data2 } = await supabase
      .from('user_connections')
      .select('user1_id')
      .eq('user2_id', userId)
      .eq('status', 'connected');

    // Combine all connected user IDs
    const connectedIds = [
      ...(data1 || []).map(d => d.user2_id),
      ...(data2 || []).map(d => d.user1_id)
    ];

    console.log('🔍 Found', connectedIds.length, 'connections');

    if (connectedIds.length === 0) {
      res.json({ connections: [] });
      return;
    }

    // Search users by name within the connected users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url')
      .in('id', connectedIds)
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Error searching connections:', error);
      res.status(500).json({ error: 'Failed to search connections' });
      return;
    }

    console.log('🔍 Search returned', users?.length || 0, 'results');

    res.json({ connections: users || [] });
  } catch (error: any) {
    console.error('Error in searchConnections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get upcoming birthdays for user's connected in-app connections.
 * GET /api/connections/birthdays/upcoming?days=14&limit=6
 */
export const getUpcomingConnectionBirthdays = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const daysRaw = typeof req.query?.days === 'string' ? Number(req.query.days) : 14;
    const limitRaw = typeof req.query?.limit === 'string' ? Number(req.query.limit) : 6;
    const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 14, 1), 90);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 6, 1), 20);

    const { data: cons, error: conErr } = await supabase
      .from('user_connections')
      .select('user1_id, user2_id, status')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'connected')
      .limit(2000);
    if (conErr) throw conErr;

    const ids = new Set<string>();
    for (const c of (cons || []) as any[]) {
      const u1 = String(c.user1_id || '');
      const u2 = String(c.user2_id || '');
      if (!u1 || !u2) continue;
      const otherUserId: string = u1 === userId ? u2 : u1;
      if (otherUserId && otherUserId !== userId) ids.add(otherUserId);
    }
    const connectedIds = Array.from(ids);
    if (connectedIds.length === 0) {
      res.json({ ok: true, days, upcoming: [] });
      return;
    }

    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url, birthday_date, birthday_visibility')
      .in('id', connectedIds);
    if (uErr) throw uErr;

    const upcoming = (users || [])
      .map((u: any) => {
        const bday = u?.birthday_date ? String(u.birthday_date) : '';
        if (!bday) return null;
        const vis = String(u?.birthday_visibility || 'connections');
        if (vis === 'private') return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bday);
        if (!m) return null;
        const month = Number(m[2]);
        const day = Number(m[3]);
        if (!month || !day) return null;

        const { nextIso, daysUntil } = computeNextOccurrenceISO(month, day);
        const displayName = `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Connection';
        return {
          userId: String(u.id),
          displayName,
          photoUrl: u?.profile_picture_url || null,
          birthdayMonth: month,
          birthdayDay: day,
          nextOccurrenceIso: nextIso,
          daysUntil,
        };
      })
      .filter(Boolean)
      .filter((x: any) => x.daysUntil >= 0 && x.daysUntil <= days)
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
      .slice(0, limit);

    res.json({ ok: true, days, upcoming });
  } catch (error: any) {
    console.error('Error in getUpcomingConnectionBirthdays:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
};
