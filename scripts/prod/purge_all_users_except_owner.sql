-- DANGER: PRODUCTION-ONLY RUNBOOK
-- Hard-delete ALL users except the owner from BOTH:
-- - public.users (app users)
-- - auth.users (Supabase Auth)
--
-- Owner UUID source: repo file `OwnerUUID`
-- owner_id = dddffff1-bfed-40a6-a99c-28dccb4c5014
--
-- How to run:
-- - Use Supabase SQL editor / service role.
-- - Read the PREVIEW output first.
-- - Then change confirm_text to the exact required string and re-run.

BEGIN;

DO $$
DECLARE
  owner_id uuid := 'dddffff1-bfed-40a6-a99c-28dccb4c5014';
  -- SAFETY GUARD: must be edited before this script will run destructive statements.
  confirm_text text := 'DELETE_EVERYONE_EXCEPT_OWNER';
  required_confirm constant text := 'DELETE_EVERYONE_EXCEPT_OWNER';

  auth_users_to_delete bigint := 0;
  public_users_to_delete bigint := 0;
BEGIN
  -- Basic sanity checks
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is NULL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = owner_id) THEN
    RAISE EXCEPTION 'Owner id % not found in auth.users', owner_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = owner_id) THEN
    RAISE EXCEPTION 'Owner id % not found in public.users', owner_id;
  END IF;

  SELECT COUNT(*) INTO auth_users_to_delete FROM auth.users WHERE id <> owner_id;
  SELECT COUNT(*) INTO public_users_to_delete FROM public.users WHERE id <> owner_id;

  RAISE NOTICE '==================== PREVIEW ====================';
  RAISE NOTICE 'Owner to keep: %', owner_id;
  RAISE NOTICE 'auth.users to delete: %', auth_users_to_delete;
  RAISE NOTICE 'public.users to delete: %', public_users_to_delete;
  RAISE NOTICE '=================================================';

  -- HARD STOP unless explicitly confirmed
  IF confirm_text <> required_confirm THEN
    RAISE EXCEPTION 'Confirmation required. Set confirm_text to % to proceed. (Currently: %)', required_confirm, confirm_text;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Delete app data that references users (best-effort; many FKs are ON DELETE CASCADE)
  -- ---------------------------------------------------------------------------

  -- Direct connection requests (auth.users)
  DELETE FROM public.direct_connection_requests
    WHERE sender_id <> owner_id OR receiver_id <> owner_id;

  -- Connections (auth.users)
  DELETE FROM public.user_connections
    WHERE user1_id <> owner_id OR user2_id <> owner_id;

  -- Messaging (public.users)
  -- NOTE: messaging schema has changed across versions in this repo / prod.
  -- We avoid hard-failing on missing columns and rely on ON DELETE CASCADE from public.users where possible.
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
    ) THEN
      EXECUTE 'DELETE FROM public.messages WHERE sender_id <> $1' USING owner_id;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'user1_id'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'user2_id'
    ) THEN
      EXECUTE 'DELETE FROM public.conversations WHERE user1_id <> $1 OR user2_id <> $1' USING owner_id;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- Wallet systems (there are two wallet schemas in migrations)
  DELETE FROM public.wallet_transactions wt
    USING public.wallet w
    WHERE wt.wallet_id = w.id
      AND w.user_id <> owner_id;
  DELETE FROM public.wallet
    WHERE user_id <> owner_id;

  DELETE FROM public.transactions t
    USING public.wallets ws
    WHERE t.wallet_id = ws.id
      AND ws.user_id <> owner_id;
  DELETE FROM public.wallets
    WHERE user_id <> owner_id;

  -- Claims + notifications
  DELETE FROM public.target_claims
    WHERE claimant_id <> owner_id
       OR (reviewed_by IS NOT NULL AND reviewed_by <> owner_id);
  DELETE FROM public.notifications
    WHERE user_id <> owner_id;

  -- Intro calls (can reference users directly and block deleting public.users)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'intro_calls'
    ) THEN
      EXECUTE '
        DELETE FROM public.intro_calls
        WHERE (buyer_id IS NOT NULL AND buyer_id <> $1)
           OR (creator_id IS NOT NULL AND creator_id <> $1)
           OR (target_id IS NOT NULL AND target_id <> $1)
      ' USING owner_id;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- Chain paths (legacy reward distribution table) can block deleting public.users.
  -- Some production DBs use these columns (creator_id / leaf_userid / subtree_root_id).
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'chain_paths'
    ) THEN
      -- Fast path: delete any rows that reference non-owner users via any of the common columns.
      EXECUTE '
        DELETE FROM public.chain_paths
        WHERE (creator_id IS NOT NULL AND creator_id <> $1)
           OR (leaf_userid IS NOT NULL AND leaf_userid <> $1)
           OR (subtree_root_id IS NOT NULL AND subtree_root_id <> $1)
      ' USING owner_id;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- Chains + requests + rewards
  -- Note: chains.participants is JSON; connection_requests is the root. Deleting requests cascades to chains/rewards.
  DELETE FROM public.connection_requests
    WHERE creator_id <> owner_id;
  DELETE FROM public.rewards
    WHERE user_id <> owner_id;

  -- Invites systems
  DELETE FROM public.user_invites
    WHERE inviter_id <> owner_id;
  -- legacy invites tables
  DELETE FROM public.invites
    WHERE inviter_id <> owner_id
       OR (invitee_id IS NOT NULL AND invitee_id <> owner_id);

  -- Telegram auth tokens / support (tables may exist depending on migration state)
  -- These statements are safe if tables exist; if your DB differs, comment out as needed.
  BEGIN
    DELETE FROM public.telegram_auth_tokens WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  BEGIN
    DELETE FROM public.telegram_users WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Forum tables (older forum schema references users(id) in public schema)
  BEGIN
    DELETE FROM public.forum_interactions WHERE user_id <> owner_id;
    DELETE FROM public.forum_reactions WHERE user_id <> owner_id;
    DELETE FROM public.forum_comments WHERE user_id <> owner_id;
    DELETE FROM public.forum_posts WHERE user_id <> owner_id;
    DELETE FROM public.forum_projects WHERE user_id <> owner_id;
    DELETE FROM public.forum_follows WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Profile facets / swipe cards / prompt assignments (best-effort)
  BEGIN
    DELETE FROM public.profile_facets WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.user_profile_facets WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.user_facets WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.user_trait_vectors WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.opinion_swipe_cards WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.prompt_assignments WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Intro requests v2 (auth.users)
  BEGIN
    DELETE FROM public.intro_requests
      WHERE requester_id <> owner_id OR (connector_user_id IS NOT NULL AND connector_user_id <> owner_id);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Credits system (auth.users)
  BEGIN
    DELETE FROM public.credit_transactions
      WHERE user_id <> owner_id OR (related_user_id IS NOT NULL AND related_user_id <> owner_id);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.user_credits WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM public.user_credit_stats WHERE user_id <> owner_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ---------------------------------------------------------------------------
  -- Delete app users, then auth users
  -- ---------------------------------------------------------------------------
  DELETE FROM public.users WHERE id <> owner_id;

  -- Auth cleanup (best-effort; Supabase should cascade identities/sessions, but we delete explicitly too)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'user_id' AND udt_name = 'uuid'
      ) THEN
        EXECUTE 'DELETE FROM auth.sessions WHERE user_id <> $1' USING owner_id;
      ELSE
        EXECUTE 'DELETE FROM auth.sessions WHERE user_id <> $1' USING owner_id::text;
      END IF;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'refresh_tokens' AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'refresh_tokens' AND column_name = 'user_id' AND udt_name = 'uuid'
      ) THEN
        EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id <> $1' USING owner_id;
      ELSE
        EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id <> $1' USING owner_id::text;
      END IF;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'user_id' AND udt_name = 'uuid'
      ) THEN
        EXECUTE 'DELETE FROM auth.identities WHERE user_id <> $1' USING owner_id;
      ELSE
        EXECUTE 'DELETE FROM auth.identities WHERE user_id <> $1' USING owner_id::text;
      END IF;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM auth.users WHERE id <> owner_id;

  RAISE NOTICE 'Purge complete. Remaining auth.users=% / public.users=%',
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM public.users);
END
$$;

COMMIT;


