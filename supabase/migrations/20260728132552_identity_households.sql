create extension if not exists pgcrypto with schema extensions;

create type public.household_member_role as enum (
  'full_member',
  'guest'
);

create type public.household_membership_status as enum (
  'active',
  'removed'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create function public.validate_iana_timezone()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  time_zone_name text := pg_catalog.to_jsonb(new) ->> tg_argv[0];
begin
  if time_zone_name is null then
    return new;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names as known_time_zones
    where known_time_zones.name = time_zone_name
  ) then
    raise exception using
      errcode = '22023',
      message = 'timezone must be a valid IANA timezone name';
  end if;

  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.validate_iana_timezone() from public;

create table public.profiles (
  user_id uuid primary key references auth.users (id),
  display_name text not null,
  email text not null,
  detected_timezone text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_display_name_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(display_name)) between 1 and 80),
  constraint profiles_email_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(email)) between 3 and 320)
);

create table public.households (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  timezone text not null,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  deleted_at timestamptz,
  constraint households_name_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 120)
);

create table public.household_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null references public.households (id),
  user_id uuid not null references public.profiles (user_id),
  role public.household_member_role not null,
  status public.household_membership_status not null default 'active',
  invited_by uuid references public.profiles (user_id),
  joined_at timestamptz not null default pg_catalog.now(),
  removed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint household_memberships_status_matches_removed_at
    check (
      (status = 'active' and removed_at is null)
      or (status = 'removed' and removed_at is not null)
    ),
  constraint household_memberships_removed_after_joined
    check (removed_at is null or removed_at >= joined_at)
);

create unique index household_memberships_one_active_membership
  on public.household_memberships (household_id, user_id)
  where status = 'active';

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger profiles_validate_detected_timezone
before insert or update of detected_timezone on public.profiles
for each row
execute function public.validate_iana_timezone('detected_timezone');

create trigger households_set_updated_at
before update on public.households
for each row
execute function public.set_updated_at();

create trigger households_validate_timezone
before insert or update of timezone on public.households
for each row
execute function public.validate_iana_timezone('timezone');

create trigger household_memberships_set_updated_at
before update on public.household_memberships
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.households enable row level security;
alter table public.households force row level security;
alter table public.household_memberships enable row level security;
alter table public.household_memberships force row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.households from public, anon, authenticated;
revoke all on table public.household_memberships from public, anon, authenticated;
