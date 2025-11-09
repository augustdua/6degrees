-- Find mafias without any members (incomplete creation)
SELECT 
  m.id,
  m.name,
  m.slug,
  m.creator_id,
  m.created_at,
  COUNT(mm.id) as member_count
FROM mafias m
LEFT JOIN mafia_members mm ON m.id = mm.mafia_id
GROUP BY m.id, m.name, m.slug, m.creator_id, m.created_at
HAVING COUNT(mm.id) = 0;

-- Delete incomplete mafias (those without any members)
DELETE FROM mafias
WHERE id IN (
  SELECT m.id
  FROM mafias m
  LEFT JOIN mafia_members mm ON m.id = mm.mafia_id
  GROUP BY m.id
  HAVING COUNT(mm.id) = 0
);

-- Verify cleanup
SELECT 
  m.id,
  m.name,
  m.slug,
  COUNT(mm.id) as member_count
FROM mafias m
LEFT JOIN mafia_members mm ON m.id = mm.mafia_id
GROUP BY m.id, m.name, m.slug;

