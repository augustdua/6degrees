-- Check your user_featured_connections
SELECT 
    ufc.id,
    ufc.user_id,
    ufc.featured_user_id,
    ufc.featured_email,
    ufc.display_order,
    u.first_name,
    u.last_name,
    u.email,
    ufc.created_at
FROM user_featured_connections ufc
LEFT JOIN users u ON u.id = ufc.featured_user_id
WHERE ufc.user_id = auth.uid()
ORDER BY ufc.display_order;

-- Check your organizations (these are what show in the collage!)
SELECT 
    uo.id,
    uo.user_id,
    uo.organization_id,
    o.name as org_name,
    o.logo_url,
    uo.position,
    uo.created_at
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = auth.uid()
ORDER BY uo.created_at;

-- Check if Praveen Kumar has organizations (for future: clicking org logos shows people)
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    o.name as org_name,
    o.logo_url
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.first_name = 'Praveen' AND u.last_name = 'Kumar';

-- Check the public profile function for your user
SELECT get_public_profile(auth.uid()::text);

