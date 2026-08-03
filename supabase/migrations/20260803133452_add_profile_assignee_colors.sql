create type public.profile_color as enum ('blue', 'pink', 'green', 'orange');

alter table public.profiles
  add column profile_color public.profile_color not null default 'blue';

-- Preserve the requested launch colors for the two existing production users.
update public.profiles
set profile_color = case
  when username = 'inkimidator' then 'pink'::public.profile_color
  else 'blue'::public.profile_color
end
where username in ('chris', 'inkimidator')
   or pg_catalog.lower(display_name) = 'chris';

comment on column public.profiles.profile_color is
  'User-selected task icon color. Neutral gray is reserved for unassigned work.';
