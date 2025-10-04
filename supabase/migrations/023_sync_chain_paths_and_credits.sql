-- Migration: Sync chain_paths and award credits when participants join
-- This ensures chain_paths is always in sync with chains.participants
-- and credits are awarded automatically

-- Function to rebuild chain_paths for a specific chain
CREATE OR REPLACE FUNCTION rebuild_chain_paths(p_chain_id UUID)
RETURNS void AS $$
DECLARE
  v_chain RECORD;
  v_participants JSONB;
  v_creator JSONB;
  v_children_map JSONB := '{}'::jsonb;
  v_leaf_nodes JSONB := '[]'::jsonb;
  v_participant JSONB;
  v_path JSONB;
  v_paths JSONB := '[]'::jsonb;
BEGIN
  -- Get chain data
  SELECT * INTO v_chain
  FROM chains
  WHERE id = p_chain_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chain not found: %', p_chain_id;
  END IF;

  v_participants := v_chain.participants;

  -- Find creator (root node)
  SELECT elem INTO v_creator
  FROM jsonb_array_elements(v_participants) elem
  WHERE elem->>'role' = 'creator'
  LIMIT 1;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'No creator found in chain: %', p_chain_id;
  END IF;

  -- Build children map (parent -> children)
  FOR v_participant IN SELECT elem FROM jsonb_array_elements(v_participants) elem
  LOOP
    IF v_participant->>'parentUserId' IS NOT NULL THEN
      DECLARE
        v_parent_id TEXT := v_participant->>'parentUserId';
        v_existing_children JSONB;
      BEGIN
        v_existing_children := COALESCE(v_children_map->v_parent_id, '[]'::jsonb);
        v_children_map := jsonb_set(
          v_children_map,
          ARRAY[v_parent_id],
          v_existing_children || jsonb_build_array(v_participant)
        );
      END;
    END IF;
  END LOOP;

  -- Find leaf nodes (nodes with no children)
  FOR v_participant IN SELECT elem FROM jsonb_array_elements(v_participants) elem
  LOOP
    DECLARE
      v_user_id TEXT := v_participant->>'userid';
      v_has_children BOOLEAN;
    BEGIN
      v_has_children := (v_children_map ? v_user_id);

      IF NOT v_has_children AND v_user_id != v_creator->>'userid' THEN
        v_leaf_nodes := v_leaf_nodes || jsonb_build_array(v_participant);
      END IF;
    END;
  END LOOP;

  -- Delete existing paths for this chain
  DELETE FROM chain_paths WHERE chain_id = p_chain_id;

  -- If only creator exists, create single path
  IF jsonb_array_length(v_leaf_nodes) = 0 THEN
    INSERT INTO chain_paths (
      chain_id,
      path_id,
      creator_id,
      leaf_userid,
      subtree_root_id,
      path_userids,
      path_participants,
      base_reward,
      current_reward,
      path_length,
      is_complete
    ) VALUES (
      p_chain_id,
      p_chain_id || '-' || (v_creator->>'userid'),
      (v_creator->>'userid')::uuid,
      (v_creator->>'userid')::uuid,
      (v_creator->>'userid')::uuid,
      ARRAY[(v_creator->>'userid')::uuid],
      jsonb_build_array(v_creator),
      0,
      0,
      1,
      (v_creator->>'role' = 'target')
    );
    RETURN;
  END IF;

  -- Build paths using recursive function
  DECLARE
    v_leaf JSONB;
    v_found_path JSONB;
  BEGIN
    FOR v_leaf IN SELECT elem FROM jsonb_array_elements(v_leaf_nodes) elem
    LOOP
      -- Find path from creator to leaf using DFS
      WITH RECURSIVE path_search AS (
        -- Start with creator
        SELECT
          v_creator AS current_node,
          jsonb_build_array(v_creator) AS path,
          1 AS depth

        UNION ALL

        -- Recursively add children
        SELECT
          child.elem AS current_node,
          ps.path || jsonb_build_array(child.elem) AS path,
          ps.depth + 1 AS depth
        FROM path_search ps
        CROSS JOIN LATERAL jsonb_array_elements(
          COALESCE(v_children_map->(ps.current_node->>'userid'), '[]'::jsonb)
        ) AS child(elem)
        WHERE ps.depth < 100 -- Prevent infinite loops
      )
      SELECT path INTO v_found_path
      FROM path_search
      WHERE current_node->>'userid' = v_leaf->>'userid'
      LIMIT 1;

      -- Insert path if found and has at least 2 nodes
      IF v_found_path IS NOT NULL AND jsonb_array_length(v_found_path) >= 2 THEN
        DECLARE
          v_path_userids UUID[];
          v_path_length INT;
        BEGIN
          -- Extract user IDs into array
          SELECT array_agg((elem->>'userid')::uuid)
          INTO v_path_userids
          FROM jsonb_array_elements(v_found_path) elem;

          v_path_length := jsonb_array_length(v_found_path);

          INSERT INTO chain_paths (
            chain_id,
            path_id,
            creator_id,
            leaf_userid,
            subtree_root_id,
            path_userids,
            path_participants,
            base_reward,
            current_reward,
            path_length,
            is_complete
          ) VALUES (
            p_chain_id,
            p_chain_id || '-' || (v_leaf->>'userid'),
            (v_creator->>'userid')::uuid,
            (v_leaf->>'userid')::uuid,
            (v_leaf->>'userid')::uuid,
            v_path_userids,
            v_found_path,
            0,
            0,
            v_path_length,
            (v_leaf->>'role' = 'target')
          );
        END;
      END IF;
    END LOOP;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to award referral credits when a new participant joins
CREATE OR REPLACE FUNCTION award_referral_credits(p_chain_id UUID, p_new_user_id UUID, p_parent_user_id UUID)
RETURNS void AS $$
DECLARE
  v_request_id UUID;
  v_credit_amount INT := 5; -- Credits awarded for referral
BEGIN
  -- Get request ID for this chain
  SELECT request_id INTO v_request_id
  FROM chains
  WHERE id = p_chain_id;

  IF v_request_id IS NULL THEN
    RAISE WARNING 'Chain % has no associated request', p_chain_id;
    RETURN;
  END IF;

  -- Award credits to parent user for the referral
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    source,
    description,
    chain_id,
    request_id,
    related_user_id
  ) VALUES (
    p_parent_user_id,
    v_credit_amount,
    'earned',
    'referral_join',
    'Earned from chain referral',
    p_chain_id,
    v_request_id,
    p_new_user_id
  );

  -- Update user_credits total
  INSERT INTO user_credits (user_id, total_credits, earned_credits, spent_credits)
  VALUES (p_parent_user_id, v_credit_amount, v_credit_amount, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_credits = user_credits.total_credits + v_credit_amount,
    earned_credits = user_credits.earned_credits + v_credit_amount,
    updated_at = now();

  RAISE NOTICE 'Awarded % credits to user % for referring user %', v_credit_amount, p_parent_user_id, p_new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to sync chain_paths and award credits when chain is updated
CREATE OR REPLACE FUNCTION sync_chain_paths_and_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_old_participants JSONB;
  v_new_participants JSONB;
  v_old_count INT;
  v_new_count INT;
  v_new_participant JSONB;
  v_parent_user_id UUID;
  v_new_user_id UUID;
BEGIN
  -- Only process if participants changed
  v_old_participants := COALESCE(OLD.participants, '[]'::jsonb);
  v_new_participants := COALESCE(NEW.participants, '[]'::jsonb);

  v_old_count := jsonb_array_length(v_old_participants);
  v_new_count := jsonb_array_length(v_new_participants);

  -- Check if a new participant was added
  IF v_new_count > v_old_count THEN
    -- Get the newly added participant (should be the last one)
    v_new_participant := v_new_participants->-1;

    -- Extract user IDs
    v_new_user_id := (v_new_participant->>'userid')::uuid;

    -- Check if the new participant has a parent
    IF v_new_participant->>'parentUserId' IS NOT NULL THEN
      v_parent_user_id := (v_new_participant->>'parentUserId')::uuid;

      -- Award credits to parent for the referral
      PERFORM award_referral_credits(NEW.id, v_new_user_id, v_parent_user_id);
    END IF;
  END IF;

  -- Rebuild chain paths
  PERFORM rebuild_chain_paths(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync chain_paths when chains.participants changes
DROP TRIGGER IF EXISTS trigger_sync_chain_paths ON chains;
CREATE TRIGGER trigger_sync_chain_paths
AFTER UPDATE OF participants ON chains
FOR EACH ROW
WHEN (OLD.participants IS DISTINCT FROM NEW.participants)
EXECUTE FUNCTION sync_chain_paths_and_credits();

-- Also sync when a new chain is created
DROP TRIGGER IF EXISTS trigger_sync_chain_paths_insert ON chains;
CREATE TRIGGER trigger_sync_chain_paths_insert
AFTER INSERT ON chains
FOR EACH ROW
EXECUTE FUNCTION sync_chain_paths_and_credits();

COMMENT ON FUNCTION rebuild_chain_paths IS 'Rebuilds all chain_paths for a given chain by traversing the participants tree';
COMMENT ON FUNCTION award_referral_credits IS 'Awards credits to a user who referred someone to join their chain';
COMMENT ON FUNCTION sync_chain_paths_and_credits IS 'Trigger function that syncs chain_paths and awards credits when participants change';
