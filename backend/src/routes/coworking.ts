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
router.get('/upcoming', authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
    const { data: bookings, error: bookingsError } = await supabase
      .from('coworking_bookings')
      .select('session_id')
      .eq('user_id', req.user!.id)
      .in('session_id', sessionIds);

    if (bookingsError) throw bookingsError;

    const bookedSet = new Set((bookings || []).map((b: any) => b.session_id));
    res.json({
      sessions: (upserted || []).map((s: any) => ({
        id: s.id,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        roomName: s.room_name,
        roomUrl: s.room_url,
        isActive: s.is_active,
        isBooked: bookedSet.has(s.id),
      })),
    });
  } catch (e: any) {
    console.error('coworking/upcoming error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// POST /api/coworking/:sessionId/book
router.post('/:sessionId/book', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { error } = await supabase.from('coworking_bookings').insert({
      session_id: sessionId,
      user_id: req.user!.id,
    });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error;
    res.json({ success: true });
  } catch (e: any) {
    console.error('coworking/book error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// POST /api/coworking/:sessionId/join
router.post('/:sessionId/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Ensure booking exists (idempotent)
    await supabase.from('coworking_bookings').upsert(
      { session_id: sessionId, user_id: req.user!.id },
      { onConflict: 'session_id,user_id' }
    );

    const { data: session, error: sessionError } = await supabase
      .from('coworking_sessions')
      .select('id, starts_at, ends_at, room_name, room_url')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) throw sessionError || new Error('Session not found');

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
  }
});

export default router;


