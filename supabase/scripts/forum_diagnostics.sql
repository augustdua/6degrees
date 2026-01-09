-- Forum diagnostics: communities + posts distribution
-- Safe: read-only (SELECT only)

-- 1) Communities: active flags + basic metadata
select
  id,
  name,
  slug,
  coalesce(is_active, true) as is_active_effective,
  is_active,
  created_at
from forum_communities
order by coalesce(is_active, true) desc, created_at asc;

-- 2) Duplicate slugs (should be none)
select slug, count(*) as cnt
from forum_communities
group by slug
having count(*) > 1
order by cnt desc, slug asc;

-- 3) Legacy communities we expect to be tags (should be inactive)
select
  id,
  name,
  slug,
  coalesce(is_active, true) as is_active_effective,
  is_active,
  created_at
from forum_communities
where slug in ('build-in-public', 'wins', 'failures', 'network', 'market-gaps')
order by slug;

-- 4) Allowed communities we expect in the sidebar
select
  id,
  name,
  slug,
  coalesce(is_active, true) as is_active_effective,
  is_active,
  created_at
from forum_communities
where slug in ('general', 'market-research', 'predictions', 'pain-points')
order by slug;

-- 5) Post counts by community (including inactive communities)
select
  c.slug as community_slug,
  c.name as community_name,
  coalesce(c.is_active, true) as community_is_active_effective,
  count(*) as post_count
from forum_posts p
join forum_communities c on c.id = p.community_id
where p.is_deleted = false
group by c.slug, c.name, coalesce(c.is_active, true)
order by post_count desc, c.slug asc;

-- 6) Posts still living in legacy communities (these should be 0 after migration)
select
  c.slug as legacy_community_slug,
  count(*) as post_count
from forum_posts p
join forum_communities c on c.id = p.community_id
where p.is_deleted = false
  and c.slug in ('build-in-public', 'wins', 'failures', 'network', 'market-gaps')
group by c.slug
order by post_count desc, c.slug asc;

-- 7) Sample 20 legacy-community posts (to verify what needs moving/tagging)
select
  p.id,
  left(p.content, 120) as content_preview,
  p.tags,
  c.slug as community_slug,
  p.created_at
from forum_posts p
join forum_communities c on c.id = p.community_id
where p.is_deleted = false
  and c.slug in ('build-in-public', 'wins', 'failures', 'network', 'market-gaps')
order by p.created_at desc
limit 20;


