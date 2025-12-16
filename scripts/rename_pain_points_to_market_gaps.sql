-- Rename/merge Pain Points community into Market Gaps and update post_type.
-- This handles both cases:
--  - Only pain-points exists  -> rename it to market-gaps
--  - Both exist              -> move posts to market-gaps, then retire pain-points
-- Safe to run multiple times.

begin;

do $$
declare
  pain_id uuid;
  gaps_id uuid;
begin
  select id into pain_id from forum_communities where slug = 'pain-points' limit 1;
  select id into gaps_id from forum_communities where slug = 'market-gaps' limit 1;

  -- Ensure Market Gaps community has the desired display name.
  if gaps_id is not null then
    update forum_communities set name = 'Market Gaps' where id = gaps_id;
  end if;

  -- Case A: market-gaps does NOT exist but pain-points does -> rename pain-points to market-gaps.
  if gaps_id is null and pain_id is not null then
    update forum_communities
    set name = 'Market Gaps', slug = 'market-gaps'
    where id = pain_id;
    gaps_id := pain_id;
    pain_id := null;
  end if;

  -- Case B: both exist -> migrate posts to market-gaps and retire pain-points.
  if gaps_id is not null and pain_id is not null and gaps_id <> pain_id then
    -- Move posts from pain-points community into market-gaps community.
    update forum_posts
    set community_id = gaps_id
    where community_id = pain_id;

    -- Retire the old pain-points community row to avoid slug collisions.
    -- Keep it around for auditability; the slug must be unique.
    update forum_communities
    set slug = 'pain-points-legacy'
    where id = pain_id and slug = 'pain-points';
  end if;
end $$;

-- Rename post_type (keep existing content fields)
update forum_posts
set post_type = 'market-gap'
where post_type = 'pain_point';

-- Ensure all market-gap posts live in the market-gaps community (idempotent).
do $$
declare
  gaps_id uuid;
begin
  select id into gaps_id from forum_communities where slug = 'market-gaps' limit 1;
  if gaps_id is not null then
    update forum_posts
    set community_id = gaps_id
    where post_type = 'market-gap'
      and (community_id is null or community_id <> gaps_id);
  end if;
end $$;

commit;


