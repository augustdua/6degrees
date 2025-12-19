-- Fix asterisks in research post titles
-- This removes markdown bold markers (**) and leading bullet points (* ) from titles

-- Preview what will be changed
SELECT id, content, 
  REGEXP_REPLACE(
    REGEXP_REPLACE(content, '\*\*', '', 'g'),
    '^\* ', ''
  ) as fixed_content
FROM forum_posts
WHERE post_type IN ('research_report', 'market-gap')
  AND content ~ '\*';

-- Actually update the titles (uncomment to run)
UPDATE forum_posts
SET content = REGEXP_REPLACE(
  REGEXP_REPLACE(content, '\*\*', '', 'g'),
  '^\* ', ''
)
WHERE post_type IN ('research_report', 'market-gap')
  AND content ~ '\*';

-- Also fix body field if it has leading asterisks in first line
UPDATE forum_posts
SET body = REGEXP_REPLACE(body, '^\* \*\*', '', 'g')
WHERE post_type IN ('research_report', 'market-gap')
  AND body ~ '^\* \*\*';

