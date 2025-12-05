-- Add body column to forum_posts for detailed post content
-- The existing 'content' field serves as the title/headline
-- The new 'body' field holds the expanded story/context

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS body TEXT;

-- Add comment for clarity
COMMENT ON COLUMN forum_posts.body IS 'Detailed post body/story. The content field serves as title.';

