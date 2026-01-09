-- Remove deprecated "coworking", "daily standups", and "founder journey" database objects.
-- Safe to run multiple times (IF EXISTS everywhere).

-- ============================================================================
-- 1) Drop triggers + functions (order matters)
-- ============================================================================

-- Daily standup streak trigger/function
DROP TRIGGER IF EXISTS trigger_update_standup_streak ON public.daily_standups;
DROP FUNCTION IF EXISTS public.update_user_standup_streak();

-- user_life_question_state updated_at trigger/function
DROP TRIGGER IF EXISTS update_user_life_question_state_timestamp ON public.user_life_question_state;
DROP FUNCTION IF EXISTS public.update_user_life_question_state_updated_at();

-- founder_projects updated_at trigger/function (if present)
DROP TRIGGER IF EXISTS update_founder_projects_timestamp ON public.founder_projects;
DROP FUNCTION IF EXISTS public.update_founder_projects_updated_at();

-- ============================================================================
-- 2) Drop tables
-- ============================================================================

-- Coworking
DROP TABLE IF EXISTS public.coworking_bookings CASCADE;
DROP TABLE IF EXISTS public.coworking_sessions CASCADE;

-- Daily standups + life questions
DROP TABLE IF EXISTS public.daily_standups CASCADE;
DROP TABLE IF EXISTS public.user_life_question_state CASCADE;
DROP TABLE IF EXISTS public.life_questions CASCADE;

-- Founder journey
DROP TABLE IF EXISTS public.founder_github_daily_commits CASCADE;
DROP TABLE IF EXISTS public.founder_projects CASCADE;

-- ============================================================================
-- 2b) Remove forum surfaces for removed features (if present)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'forum_communities'
  ) THEN
    DELETE FROM public.forum_communities WHERE slug = 'daily-standups';
  END IF;
END $$;

-- ============================================================================
-- 3) Drop users columns that were only for standup gating/streaks
-- ============================================================================

ALTER TABLE public.users DROP COLUMN IF EXISTS standup_current_streak;
ALTER TABLE public.users DROP COLUMN IF EXISTS standup_max_streak;
ALTER TABLE public.users DROP COLUMN IF EXISTS standup_last_completed_date;
ALTER TABLE public.users DROP COLUMN IF EXISTS standup_skipped_today;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


