import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

async function getDailyStandupsCommunityId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', 'daily-standups')
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

function standupToForumContent(localDate: string, today: string): string {
  const t = String(today || '').trim().replace(/\s+/g, ' ');
  if (!t) return `Standup • ${localDate}`;
  return `Standup • ${localDate} — ${t.slice(0, 120)}${t.length > 120 ? '…' : ''}`;
}

function standupToForumBody(args: { localDate: string; yesterday: string; today: string; blockers?: string | null }): string {
  const { localDate, yesterday, today, blockers } = args;
  const lines: string[] = [];
  lines.push(`Date: ${localDate}`);
  lines.push('');
  lines.push('Yesterday');
  lines.push(String(yesterday || '').trim());
  lines.push('');
  lines.push('Today');
  lines.push(String(today || '').trim());
  if (blockers && String(blockers).trim()) {
    lines.push('');
    lines.push('Blockers');
    lines.push(String(blockers).trim());
  }
  return lines.join('\n');
}

async function upsertStandupForumPost(args: {
  userId: string;
  projectId?: string | null;
  localDate: string;
  yesterday: string;
  today: string;
  blockers?: string | null;
}): Promise<{ action: 'created' | 'updated' | 'skipped'; postId?: string }> {
  const communityId = await getDailyStandupsCommunityId();
  if (!communityId) return { action: 'skipped' };

  const milestoneTitle = `Standup ${args.localDate}`;
  const content = standupToForumContent(args.localDate, args.today);
  const body = standupToForumBody({
    localDate: args.localDate,
    yesterday: args.yesterday,
    today: args.today,
    blockers: args.blockers,
  });

  // Find existing post for this user+day (no DB migration required)
  const { data: existing, error: exErr } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('user_id', args.userId)
    .eq('community_id', communityId)
    .eq('milestone_title', milestoneTitle)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from('forum_posts')
      .update({
        content,
        body,
        project_id: args.projectId || null,
        post_type: 'regular',
        milestone_title: milestoneTitle,
        day_number: null,
        tags: ['daily-standup'],
        updated_at: new Date().toISOString(),
        is_deleted: false,
      })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    return { action: 'updated', postId: String(existing.id) };
  }

  const { data: created, error: crErr } = await supabase
    .from('forum_posts')
    .insert({
      community_id: communityId,
      user_id: args.userId,
      project_id: args.projectId || null,
      content,
      body,
      media_urls: [],
      post_type: 'regular',
      day_number: null,
      milestone_title: milestoneTitle,
      tags: ['daily-standup'],
      is_deleted: false,
    })
    .select('id')
    .single();
  if (crErr) throw crErr;
  return { action: 'created', postId: created?.id ? String(created.id) : undefined };
}

async function getOrCreateFounderProjectId(userId: string): Promise<string | null> {
  try {
    const { data: existing, error: exErr } = await supabase
      .from('founder_projects')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing?.id) return String(existing.id);

    const { data: created, error: crErr } = await supabase
      .from('founder_projects')
      .insert({ user_id: userId, name: 'My Venture', is_public: true })
      .select('id')
      .single();
    if (crErr) throw crErr;
    return created?.id ? String(created.id) : null;
  } catch {
    // If the table isn't migrated yet in an environment, standups still work.
    return null;
  }
}

function isValidIanaTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    // Throws RangeError for invalid timeZone
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getLocalDateISO(timeZone: string, date: Date): string {
  // Stable YYYY-MM-DD without bringing in a dependency.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  if (!year || !month || !day) {
    // Fallback (shouldn't happen in modern runtimes)
    const fallback = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
    return fallback;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Calculate streak based on user's standup history
 */
async function calculateStreak(userId: string, currentLocalDate: string): Promise<{ current: number; max: number }> {
  // Get user's streak data
  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('standup_current_streak, standup_max_streak, standup_last_completed_date')
    .eq('id', userId)
    .single();

  if (userErr) {
    console.error('Error fetching user streak data:', userErr);
    return { current: 0, max: 0 };
  }

  const currentStreak = userData?.standup_current_streak || 0;
  const maxStreak = userData?.standup_max_streak || 0;
  const lastCompletedDate = userData?.standup_last_completed_date;

  // Check if streak would continue today
  if (lastCompletedDate) {
    const lastDate = new Date(lastCompletedDate);
    const today = new Date(currentLocalDate);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format yesterday as YYYY-MM-DD
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Streak continues if last completed was yesterday or today
    if (lastCompletedDate === currentLocalDate) {
      return { current: currentStreak, max: maxStreak };
    } else if (lastCompletedDate === yesterdayStr) {
      return { current: currentStreak, max: maxStreak };
    }
  }

  // Streak would be broken/reset
  return { current: 0, max: maxStreak };
}

/**
 * GET /api/daily-standup/status?timezone=America/Los_Angeles
 * Returns whether user has completed today's standup (as defined by user's local date).
 * Now includes streak information.
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const timezone = req.query.timezone;

    if (!isValidIanaTimeZone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone (IANA) is required' });
      return;
    }

    const localDate = getLocalDateISO(timezone, new Date());

    // Check if standup already completed today
    const { data: existing, error: existingErr } = await supabase
      .from('daily_standups')
      .select('id')
      .eq('user_id', userId)
      .eq('local_date', localDate)
      .maybeSingle();
    if (existingErr) throw existingErr;

    // Check if user skipped today
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('standup_skipped_today, standup_current_streak, standup_max_streak, standup_last_completed_date')
      .eq('id', userId)
      .single();
    if (userErr && userErr.code !== 'PGRST116') throw userErr;

    const skippedToday = userData?.standup_skipped_today || false;

    // Get streak info
    const streak = await calculateStreak(userId, localDate);

    if (existing?.id || skippedToday) {
      res.json({
        completedToday: true,
        skippedToday,
        localDate,
        timezone,
        streak: streak.current,
        maxStreak: streak.max
      });
      return;
    }

    res.json({
      completedToday: false,
      skippedToday: false,
      localDate,
      timezone,
      streak: streak.current,
      maxStreak: streak.max
    });
  } catch (error: any) {
    console.error('Error in GET /api/daily-standup/status:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/daily-standup/submit
 * Simplified standup - only yesterday and today required
 * Body:
 * {
 *   timezone: string,
 *   yesterday: string,
 *   today: string
 * }
 */
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { timezone, yesterday, today, blockers } = req.body || {};

    if (!isValidIanaTimeZone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone (IANA) is required' });
      return;
    }

    if (typeof yesterday !== 'string' || yesterday.trim().length < 2) {
      res.status(400).json({ error: 'yesterday is required (min 2 characters)' });
      return;
    }
    if (typeof today !== 'string' || today.trim().length < 2) {
      res.status(400).json({ error: 'today is required (min 2 characters)' });
      return;
    }

    const localDate = getLocalDateISO(timezone, new Date());
    const projectId = await getOrCreateFounderProjectId(userId);

    // Insert simplified standup (without question/answer - those columns will be empty)
    const row = {
      user_id: userId,
      local_date: localDate,
      timezone,
      yesterday: yesterday.trim(),
      today: today.trim(),
      ...(typeof blockers === 'string' ? { blockers: blockers.trim() } : {}),
      ...(projectId ? { project_id: projectId } : {}),
      // Use placeholder values for legacy question fields to satisfy NOT NULL constraints
      question_id: 'standup-only',
      question_text: 'Daily standup (simplified)',
      answer: 'N/A'
    };

    const { data, error: upsertErr } = await supabase
      .from('daily_standups')
      .upsert(row, { onConflict: 'user_id,local_date' })
      .select('id, user_id, local_date, created_at')
      .single();
    if (upsertErr) throw upsertErr;

    // Mirror standup into the Daily Standups forum community (best-effort).
    let forumSync: { action: 'created' | 'updated' | 'skipped'; postId?: string } = { action: 'skipped' };
    try {
      forumSync = await upsertStandupForumPost({
        userId,
        projectId,
        localDate,
        yesterday: yesterday.trim(),
        today: today.trim(),
        blockers: typeof blockers === 'string' ? blockers.trim() : null,
      });
    } catch (e) {
      console.error('Error mirroring standup to forum:', e);
    }

    // Reset skipped_today flag if it was set
    await supabase
      .from('users')
      .update({ standup_skipped_today: false })
      .eq('id', userId);

    // Get updated streak (trigger should have updated it)
    const streak = await calculateStreak(userId, localDate);

    res.json({
      success: true,
      completedToday: true,
      localDate,
      id: data.id,
      streak: streak.current,
      maxStreak: streak.max,
      forumSync
    });
  } catch (error: any) {
    console.error('Error in POST /api/daily-standup/submit:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/daily-standup/backfill-to-forum?limit=30
 * Mirrors the authenticated user's existing daily_standups rows into forum_posts
 * under the `daily-standups` community (for visibility in the community feed).
 */
router.post('/backfill-to-forum', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limitRaw = req.query.limit;
    const limit = Math.max(1, Math.min(60, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) || 30 : 30));

    const { data: rows, error } = await supabase
      .from('daily_standups')
      .select('id, project_id, local_date, yesterday, today, blockers')
      .eq('user_id', userId)
      .order('local_date', { ascending: false })
      .limit(limit);
    if (error) throw error;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const r of (rows || []) as any[]) {
      const localDate = String(r.local_date || '').trim();
      const y = String(r.yesterday || '').trim();
      const t = String(r.today || '').trim();
      if (!localDate || !y || !t) {
        skipped += 1;
        continue;
      }
      const result = await upsertStandupForumPost({
        userId,
        projectId: r.project_id ? String(r.project_id) : null,
        localDate,
        yesterday: y,
        today: t,
        blockers: r.blockers ? String(r.blockers) : null,
      });
      if (result.action === 'created') created += 1;
      else if (result.action === 'updated') updated += 1;
      else skipped += 1;
    }

    res.json({ success: true, created, updated, skipped });
  } catch (e: any) {
    console.error('Error in POST /api/daily-standup/backfill-to-forum:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

/**
 * POST /api/daily-standup/skip
 * Skip today's standup - unlocks feed but breaks streak
 * Body:
 * {
 *   timezone: string
 * }
 */
router.post('/skip', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { timezone } = req.body || {};

    if (!isValidIanaTimeZone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone (IANA) is required' });
      return;
    }

    const localDate = getLocalDateISO(timezone, new Date());

    // Mark as skipped and reset streak
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        standup_skipped_today: true,
        standup_current_streak: 0
      })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // Get updated streak info
    const { data: userData } = await supabase
      .from('users')
      .select('standup_max_streak')
      .eq('id', userId)
      .single();

    res.json({
      success: true,
      skipped: true,
      localDate,
      streak: 0,
      maxStreak: userData?.standup_max_streak || 0
    });
  } catch (error: any) {
    console.error('Error in POST /api/daily-standup/skip:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/daily-standup/history?limit=10
 * Returns recent daily standups for the authenticated user (for profile display).
 */
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limitRaw = req.query.limit;
    const limit = Math.max(
      1,
      Math.min(50, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) || 10 : 10)
    );

    const { data, error } = await supabase
      .from('daily_standups')
      .select('id, project_id, local_date, timezone, yesterday, today, blockers, question_text, answer, created_at')
      .eq('user_id', userId)
      .order('local_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ standups: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/daily-standup/history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
