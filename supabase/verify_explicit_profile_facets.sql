-- ============================================================================
-- Verify explicit profile facets tables + RLS
-- Run in Supabase SQL editor as:
-- 1) service_role (admin) to verify tables exist and seed data
-- 2) as an authenticated user (via SQL editor "Run as role") to verify RLS
-- ============================================================================

-- 1) Tables exist
select to_regclass('public.skills') as skills,
       to_regclass('public.roles') as roles,
       to_regclass('public.industries') as industries,
       to_regclass('public.user_skills') as user_skills,
       to_regclass('public.user_roles') as user_roles,
       to_regclass('public.user_industries') as user_industries,
       to_regclass('public.user_needs') as user_needs,
       to_regclass('public.user_offerings') as user_offerings;

-- 2) Seed data present
select count(*) as skills_count from public.skills;
select count(*) as roles_count from public.roles;
select count(*) as industries_count from public.industries;

-- 3) Vocab readable
select * from public.skills order by name limit 10;
select * from public.roles order by name limit 10;
select * from public.industries order by name limit 10;

-- 4) As an authenticated user: replace with your user id
-- (In SQL editor, set the auth context or use the "Run as role" feature.)
-- select auth.uid();

-- 5) Own rows writable (should succeed when auth.uid() matches user_id)
-- insert into public.user_needs (user_id, need_text) values (auth.uid(), 'Need intros to fintech VCs in India');
-- insert into public.user_offerings (user_id, offering_text) values (auth.uid(), 'Can help with GTM strategy');

-- 6) Own rows readable
-- select * from public.user_needs where user_id = auth.uid();
-- select * from public.user_offerings where user_id = auth.uid();

-- 7) Cross-user read should be blocked by RLS (should return 0 rows for other users)
-- select * from public.user_needs where user_id <> auth.uid() limit 1;
-- select * from public.user_offerings where user_id <> auth.uid() limit 1;


