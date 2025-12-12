-- ============================================================================
-- Migrate existing forum interactions into unified `interactions` table
-- ============================================================================
-- Only migrates rows that reference a concrete target (post_id or comment_id).
-- Rows like poll generation logs without a target are intentionally skipped.
-- ============================================================================

INSERT INTO interactions (
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  metadata,
  created_at
)
SELECT
  fi.user_id,
  'migrated_' || fi.id::text,
  CASE
    WHEN fi.comment_id IS NOT NULL THEN 'forum_comment'
    ELSE 'forum_post'
  END,
  COALESCE(fi.comment_id, fi.post_id),
  fi.interaction_type,
  COALESCE(fi.metadata, '{}'::jsonb),
  fi.created_at
FROM forum_interactions fi
WHERE fi.post_id IS NOT NULL OR fi.comment_id IS NOT NULL;



