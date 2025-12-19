-- Create an "events" community for location polls + event photos
-- Run in Supabase SQL editor.

insert into public.forum_communities (name, slug, description, icon, color, is_active, display_order)
values (
  'Events',
  'events',
  'IRL + online events. Use polls for location/date, and post photos/recaps.',
  'Calendar',
  '#CBAA5A',
  true,
  35
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  is_active = true,
  display_order = excluded.display_order;


