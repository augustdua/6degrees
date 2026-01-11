-- Check whether an invited user (invitee) is connected to the inviter.
-- Also checks the "directed edge" (attribution) via users.invited_by_user_id.
--
-- Usage (psql):
--   \set inviter_id '00000000-0000-0000-0000-000000000000'
--   \set invitee_id '00000000-0000-0000-0000-000000000000'
--   \i scripts/prod/check_referral_connection.sql
--
-- Or replace the :'inviter_id' / :'invitee_id' vars below with literal UUIDs.

\echo '--- Inputs ---'
SELECT
  :'inviter_id'::uuid AS inviter_id,
  :'invitee_id'::uuid AS invitee_id;

\echo '--- users table: directed edge + existence ---'
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.invited_by_user_id,
  (u.invited_by_user_id = :'inviter_id'::uuid) AS invitee_points_to_inviter
FROM public.users u
WHERE u.id IN (:'inviter_id'::uuid, :'invitee_id'::uuid)
ORDER BY u.id;

\echo '--- user_connections table: undirected edge exists? ---'
SELECT
  uc.id,
  uc.user1_id,
  uc.user2_id,
  uc.status,
  uc.connected_at,
  uc.connection_request_id,
  (uc.user1_id = LEAST(:'inviter_id'::uuid, :'invitee_id'::uuid)
    AND uc.user2_id = GREATEST(:'inviter_id'::uuid, :'invitee_id'::uuid)) AS matches_pair
FROM public.user_connections uc
WHERE (uc.user1_id = LEAST(:'inviter_id'::uuid, :'invitee_id'::uuid)
   AND uc.user2_id = GREATEST(:'inviter_id'::uuid, :'invitee_id'::uuid))
   OR (uc.user1_id IN (:'inviter_id'::uuid, :'invitee_id'::uuid)
   AND uc.user2_id IN (:'inviter_id'::uuid, :'invitee_id'::uuid))
ORDER BY uc.connected_at DESC NULLS LAST;

\echo '--- RPC get_user_connections(inviter): does invitee show up? ---'
SELECT *
FROM public.get_user_connections(:'inviter_id'::uuid)
WHERE connected_user_id = :'invitee_id'::uuid;

\echo '--- user_invites: any accepted invite tying these users? ---'
SELECT
  ui.id,
  ui.inviter_id,
  ui.invitee_email,
  ui.invitee_user_id,
  ui.status,
  ui.accepted_at,
  ui.created_at
FROM public.user_invites ui
WHERE ui.inviter_id = :'inviter_id'::uuid
  AND (ui.invitee_user_id = :'invitee_id'::uuid OR ui.invitee_email = (SELECT email FROM public.users WHERE id = :'invitee_id'::uuid))
ORDER BY ui.created_at DESC;


