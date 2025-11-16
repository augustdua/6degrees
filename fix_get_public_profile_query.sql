-- Fix: Use UUID instead of text
SELECT get_public_profile(auth.uid());

-- Or check if your organizations are showing up:
SELECT 
    u.first_name,
    u.last_name,
    json_agg(
        json_build_object(
            'name', o.name,
            'logo_url', o.logo_url,
            'position', uo.position
        )
    ) as organizations
FROM users u
LEFT JOIN user_organizations uo ON uo.user_id = u.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE u.id = auth.uid()
GROUP BY u.id, u.first_name, u.last_name;

