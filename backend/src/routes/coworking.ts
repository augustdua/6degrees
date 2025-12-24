import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { createNamedRoom, generateMeetingToken } from '../services/dailyService';

const router = Router();

function roundUpToNextHour(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  if (x.getTime() <= d.getTime()) x.setHours(x.getHours() + 1);
  return x;
}

function roomNameForStart(start: Date) {
  // grindhouse-2025-12-24T13-00Z
  const iso = start.toISOString().replace(/:|\./g, '-').replace('000Z', 'Z');
  return `grindhouse-${iso}`;
}

// GET /api/coworking/upcoming?limit=6
router.get('/upcoming', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '6'), 10) || 6, 1), 24);
    const now = new Date();
    const start = roundUpToNextHour(now);

    const slots = Array.from({ length: limit }, (_, i) => {
      const s = new Date(start);
      s.setHours(s.getHours() + i);
      const e = new Date(s);
      e.setHours(e.getHours() + 1);
      return { startsAt: s, endsAt: e, roomName: roomNameForStart(s) };
    });

    // Upsert sessions (idempotent)
    const { data: upserted, error: upsertError } = await supabase
      .from('coworking_sessions')
      .upsert(
        slots.map((s) => ({
          starts_at: s.startsAt.toISOString(),
          ends_at: s.endsAt.toISOString(),
          room_name: s.roomName,
          is_active: true,
        })),
        { onConflict: 'starts_at' }
      )
      .select('id, starts_at, ends_at, room_name, room_url, is_active')
      .order('starts_at', { ascending: true });

    if (upsertError) throw upsertError;

    const sessionIds = (upserted || []).map((s: any) => s.id);
    
    // Get user's own bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('coworking_bookings')
      .select('id, session_id, created_at, work_intent')
      .eq('user_id', req.user!.id)
      .in('session_id', sessionIds);

    if (bookingsError) throw bookingsError;

    // Get total booking counts per session
    const { data: bookingCounts, error: countsError } = await supabase
      .from('coworking_bookings')
      .select('session_id')
      .in('session_id', sessionIds);

    if (countsError) throw countsError;

    const countBySession = new Map<string, number>();
    for (const b of bookingCounts || []) {
      const sid = (b as any).session_id;
      countBySession.set(sid, (countBySession.get(sid) || 0) + 1);
    }

    const bookingBySession = new Map<string, any>();
    for (const b of bookings || []) {
      bookingBySession.set((b as any).session_id, b);
    }
    res.json({
      sessions: (upserted || []).map((s: any) => ({
        id: s.id,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        roomName: s.room_name,
        roomUrl: s.room_url,
        isActive: s.is_active,
        booking: bookingBySession.get(s.id)
          ? {
              id: bookingBySession.get(s.id).id,
              createdAt: bookingBySession.get(s.id).created_at,
              workIntent: bookingBySession.get(s.id).work_intent,
            }
          : null,
        isBooked: bookingBySession.has(s.id),
        bookingCount: countBySession.get(s.id) || 0,
      })),
    });
  } catch (e: any) {
    console.error('coworking/upcoming error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
});

// POST /api/coworking/:sessionId/book
router.post('/:sessionId/book', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const workIntentRaw = (req.body?.workIntent ?? req.body?.work_intent ?? '') as string;
    const workIntent = String(workIntentRaw || '').trim();

    if (!workIntent) {
      res.status(400).json({ error: 'workIntent is required' });
      return;
    }
    const { error } = await supabase.from('coworking_bookings').insert({
      session_id: sessionId,
      user_id: req.user!.id,
      work_intent: workIntent,
    });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error;
    res.json({ success: true });
  } catch (e: any) {
    console.error('coworking/book error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
});

// DELETE /api/coworking/:sessionId/book
router.delete('/:sessionId/book', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { error } = await supabase
      .from('coworking_bookings')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', req.user!.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    console.error('coworking/cancel error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
});

// GET /api/coworking/my-sessions
// Returns bookings for the current user, split by upcoming/past on the client.
router.get('/my-sessions', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('coworking_bookings')
      .select(
        `
        id,
        created_at,
        work_intent,
        session:coworking_sessions(
          id,
          starts_at,
          ends_at,
          room_name,
          room_url,
          is_active
        )
      `
      )
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bookings = (data || []).map((b: any) => ({
      id: b.id,
      createdAt: b.created_at,
      workIntent: b.work_intent,
      session: b.session
        ? {
            id: b.session.id,
            startsAt: b.session.starts_at,
            endsAt: b.session.ends_at,
            roomName: b.session.room_name,
            roomUrl: b.session.room_url,
            isActive: b.session.is_active,
          }
        : null,
    }));

    res.json({ bookings });
  } catch (e: any) {
    console.error('coworking/my-sessions error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
});

// POST /api/coworking/:sessionId/join
router.post('/:sessionId/join', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Booking must exist (work_intent is required), so user must book before joining.
    const { data: booking, error: bookingError } = await supabase
      .from('coworking_bookings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) {
      res.status(400).json({ error: 'Please book this session first' });
      return;
    }

    const { data: session, error: sessionError } = await supabase
      .from('coworking_sessions')
      .select('id, starts_at, ends_at, room_name, room_url')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) throw sessionError || new Error('Session not found');

    // Join window enforcement (disabled by default for testing).
    // To re-enable strict windows, set: COWORKING_ENFORCE_JOIN_WINDOW=1
    const enforceJoinWindow = String(process.env.COWORKING_ENFORCE_JOIN_WINDOW || '') === '1';
    if (enforceJoinWindow) {
      // Enforce join window: 10 minutes before start until 15 minutes after start.
      const startsAt = new Date((session as any).starts_at);
      const now = Date.now();
      const joinOpensAt = startsAt.getTime() - 10 * 60 * 1000;
      const joinClosesAt = startsAt.getTime() + 15 * 60 * 1000;

      if (now < joinOpensAt) {
        res.status(400).json({ error: 'Join opens 10 minutes before start' });
        return;
      }
      if (now > joinClosesAt) {
        res.status(400).json({ error: 'Late entry window closed (15 minutes after start)' });
        return;
      }
    }

    // Ensure Daily room exists + persist URL
    let roomUrl = (session as any).room_url as string | null;
    const roomName = (session as any).room_name as string;
    const endsAt = new Date((session as any).ends_at);

    if (!roomUrl) {
      const expiresIn = Math.max(900, Math.floor((endsAt.getTime() - Date.now()) / 1000) + 60 * 15);
      const room = await createNamedRoom(roomName, expiresIn, 50);
      roomUrl = (room as any)?.url || null;
      if (roomUrl) {
        await supabase.from('coworking_sessions').update({ room_url: roomUrl }).eq('id', sessionId);
      }
    }

    const fullName = req.user?.fullName || req.user?.email || 'Zaurq User';
    const token = await generateMeetingToken(roomName, fullName, false, 7200, {
      role: 'coworking',
      sessionId,
      userId: req.user!.id,
    });

    res.json({
      roomName,
      roomUrl,
      token,
    });
  } catch (e: any) {
    console.error('coworking/join error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
});

export default router;


