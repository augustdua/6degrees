-- Opinion swipe cards (r/india) + user swipe responses
-- Left = Disagree, Right = Agree (client-side meaning)

BEGIN;

-- ----------------------------------------------------------------------------
-- opinion_cards: global reusable pool of generated statements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opinion_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  subreddit TEXT,
  external_id TEXT,
  external_url TEXT,
  title TEXT,
  body TEXT,
  generated_statement TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplicate by external id per source (safe w/ NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_opinion_cards_source_external_id
  ON public.opinion_cards(source, external_id);

CREATE INDEX IF NOT EXISTS idx_opinion_cards_created_at
  ON public.opinion_cards(created_at DESC);

-- ----------------------------------------------------------------------------
-- user_opinion_swipes: per-user responses to opinion cards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_opinion_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opinion_card_id UUID NOT NULL REFERENCES public.opinion_cards(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opinion_card_id)
);

CREATE INDEX IF NOT EXISTS idx_user_opinion_swipes_user_id
  ON public.user_opinion_swipes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_opinion_swipes_card_id
  ON public.user_opinion_swipes(opinion_card_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.opinion_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_opinion_swipes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read opinion cards
DROP POLICY IF EXISTS "Allow authenticated read access to opinion_cards" ON public.opinion_cards;
CREATE POLICY "Allow authenticated read access to opinion_cards"
  ON public.opinion_cards FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can insert opinion_cards (generated server-side)
DROP POLICY IF EXISTS "Service role can manage opinion_cards" ON public.opinion_cards;
CREATE POLICY "Service role can manage opinion_cards"
  ON public.opinion_cards FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Users can insert their own swipes
DROP POLICY IF EXISTS "Users can insert own opinion swipes" ON public.user_opinion_swipes;
CREATE POLICY "Users can insert own opinion swipes"
  ON public.user_opinion_swipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own swipes
DROP POLICY IF EXISTS "Users can read own opinion swipes" ON public.user_opinion_swipes;
CREATE POLICY "Users can read own opinion swipes"
  ON public.user_opinion_swipes FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access to user_opinion_swipes" ON public.user_opinion_swipes;
CREATE POLICY "Service role full access to user_opinion_swipes"
  ON public.user_opinion_swipes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

COMMIT;


