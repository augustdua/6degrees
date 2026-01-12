import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate);

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

// Haversine distance in meters
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371e3;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * GET /api/lunches/suggestions
 * Query:
 * - lat: number (required)
 * - lng: number (required)
 * - radiusKm: number (default 5, max 25)
 * - limit: number (default 6, max 20)
 *
 * Note: MVP matches within your existing connections (private-first).
 */
router.get('/suggestions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    const radiusKmRaw = toNumber(req.query.radiusKm);
    const limitRaw = toNumber(req.query.limit);

    if (lat === null || lng === null) {
      res.status(400).json({ ok: false, error: 'Missing lat/lng' });
      return;
    }

    const radiusKm = Math.min(Math.max(radiusKmRaw ?? 5, 1), 25);
    const limit = Math.min(Math.max(Math.round(limitRaw ?? 6), 1), 20);

    // Store/update the user's latest location (no history)
    await supabase
      .from('user_locations')
      .upsert({ user_id: userId, lat, lng }, { onConflict: 'user_id' });

    // Best-effort housekeeping: expire old pending suggestions
    const nowIso = new Date().toISOString();
    await supabase
      .from('lunch_suggestions')
      .update({ status: 'expired' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('expires_at', nowIso);

    // Prefer returning existing pending suggestions (stable list)
    const { data: pending, error: pendingErr } = await supabase
      .from('lunch_suggestions')
      .select('id, suggested_user_id, suggested_lat, suggested_lng, distance_meters, score, reasons, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('distance_meters', { ascending: true })
      .limit(limit);

    if (pendingErr) throw pendingErr;

    const pendingRows = pending || [];
    if (pendingRows.length > 0) {
      const ids = pendingRows.map((r: any) => r.suggested_user_id).filter(Boolean);
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, profile_picture_url, bio, location')
        .in('id', ids);
      if (usersErr) throw usersErr;

      // Profession: use primary explicit role name (user_roles -> roles)
      const { data: rolesRows, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, is_primary, created_at, role:roles(name)')
        .in('user_id', ids)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (rolesErr) throw rolesErr;
      const roleByUserId = new Map<string, string>();
      for (const rr of rolesRows || []) {
        const uid = String((rr as any).user_id);
        if (roleByUserId.has(uid)) continue;
        const roleName = (rr as any)?.role?.name;
        if (typeof roleName === 'string' && roleName.trim()) roleByUserId.set(uid, roleName.trim());
      }

      const byId = new Map<string, any>((users || []).map((u: any) => [String(u.id), u]));

      res.json({
        ok: true,
        suggestions: pendingRows.map((r: any) => {
          const u = byId.get(String(r.suggested_user_id));
          const personName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : 'Unknown';
          return {
            id: r.id,
            personId: r.suggested_user_id,
            personName,
            profession: roleByUserId.get(String(r.suggested_user_id)) || null,
            photoUrl: u?.profile_picture_url ?? null,
            headline: u?.bio ?? null,
            locationLabel: u?.location ?? null,
            lat: r.suggested_lat ?? null,
            lng: r.suggested_lng ?? null,
            distanceMeters: r.distance_meters ?? null,
          };
        }),
      });
      return;
    }

    // MVP candidate set: your connected users
    const { data: connections, error: connErr } = await supabase
      .from('user_connections')
      .select('user1_id, user2_id, status')
      .eq('status', 'connected')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    if (connErr) throw connErr;

    const connectedIds = new Set<string>();
    for (const c of connections || []) {
      const u1 = String((c as any).user1_id);
      const u2 = String((c as any).user2_id);
      if (u1 === userId && u2) connectedIds.add(u2);
      if (u2 === userId && u1) connectedIds.add(u1);
    }

    const candidateIds = Array.from(connectedIds);
    if (candidateIds.length === 0) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    // Exclude people you've recently rejected/accepted (avoid re-suggesting too soon)
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(); // 14 days
    const { data: recentDecisions, error: recentErr } = await supabase
      .from('lunch_suggestions')
      .select('suggested_user_id, status, updated_at')
      .eq('user_id', userId)
      .in('status', ['rejected', 'accepted'])
      .gt('updated_at', cutoff);
    if (recentErr) throw recentErr;
    const excluded = new Set<string>((recentDecisions || []).map((r: any) => String(r.suggested_user_id)));

    const filteredCandidateIds = candidateIds.filter((id) => !excluded.has(String(id)));
    if (filteredCandidateIds.length === 0) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    // Pull last known locations for candidates
    const latDelta = radiusKm / 111; // ~km per degree latitude
    const lngDelta = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180))); // avoid blowups near poles

    const { data: locs, error: locErr } = await supabase
      .from('user_locations')
      .select('user_id, lat, lng, updated_at')
      .in('user_id', filteredCandidateIds)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta);
    if (locErr) throw locErr;

    const origin = { lat, lng };
    const radiusMeters = radiusKm * 1000;

    const scored = (locs || [])
      .map((l: any) => {
        const dist = haversineMeters(origin, { lat: l.lat, lng: l.lng });
        return { userId: String(l.user_id), lat: l.lat, lng: l.lng, dist };
      })
      .filter((x) => Number.isFinite(x.dist) && x.dist <= radiusMeters)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit);

    if (scored.length === 0) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url, bio, location')
      .in('id', scored.map((s) => s.userId));
    if (usersErr) throw usersErr;
    const byId = new Map<string, any>((users || []).map((u: any) => [String(u.id), u]));

    const { data: rolesRows, error: rolesErr } = await supabase
      .from('user_roles')
      .select('user_id, is_primary, created_at, role:roles(name)')
      .in('user_id', scored.map((s) => s.userId))
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });
    if (rolesErr) throw rolesErr;
    const roleByUserId = new Map<string, string>();
    for (const rr of rolesRows || []) {
      const uid = String((rr as any).user_id);
      if (roleByUserId.has(uid)) continue;
      const roleName = (rr as any)?.role?.name;
      if (typeof roleName === 'string' && roleName.trim()) roleByUserId.set(uid, roleName.trim());
    }

    // Insert pending suggestions so they persist
    const insertRows = scored.map((s) => ({
      user_id: userId,
      suggested_user_id: s.userId,
      suggested_lat: s.lat,
      suggested_lng: s.lng,
      distance_meters: Math.round(s.dist),
      score: null,
      reasons: ['nearby'],
      status: 'pending',
    }));

    // Best-effort insert; if conflicts happen (race), we fall back to select.
    await supabase.from('lunch_suggestions').insert(insertRows);

    const { data: created, error: createdErr } = await supabase
      .from('lunch_suggestions')
      .select('id, suggested_user_id, suggested_lat, suggested_lng, distance_meters, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('distance_meters', { ascending: true })
      .limit(limit);
    if (createdErr) throw createdErr;

    const createdRows = created || [];
    res.json({
      ok: true,
      suggestions: createdRows.map((r: any) => {
        const u = byId.get(String(r.suggested_user_id));
        const personName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : 'Unknown';
        return {
          id: r.id,
          personId: r.suggested_user_id,
          personName,
          profession: roleByUserId.get(String(r.suggested_user_id)) || null,
          photoUrl: u?.profile_picture_url ?? null,
          headline: u?.bio ?? null,
          locationLabel: u?.location ?? null,
          lat: r.suggested_lat ?? null,
          lng: r.suggested_lng ?? null,
          distanceMeters: r.distance_meters ?? null,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error in GET /api/lunches/suggestions:', error);
    res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
});

router.post('/suggestions/:id/accept', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id || '').trim();
    if (!userId) return void res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (!id) return void res.status(400).json({ ok: false, error: 'Missing id' });

    const { data, error } = await supabase
      .from('lunch_suggestions')
      .update({ status: 'accepted' })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return void res.status(404).json({ ok: false, error: 'Not found' });

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error in POST /api/lunches/suggestions/:id/accept:', error);
    res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
});

router.post('/suggestions/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id || '').trim();
    if (!userId) return void res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (!id) return void res.status(400).json({ ok: false, error: 'Missing id' });

    const { data, error } = await supabase
      .from('lunch_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return void res.status(404).json({ ok: false, error: 'Not found' });

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error in POST /api/lunches/suggestions/:id/reject:', error);
    res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
});

export default router;


