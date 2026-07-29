create table public.household_join_links (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  role public.household_member_role not null default 'full_member',
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses smallint not null default 12,
  use_count smallint not null default 0,
  created_by uuid not null references public.profiles (user_id),
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint household_join_links_expiry_is_future check (expires_at > created_at),
  constraint household_join_links_max_uses_is_bounded check (max_uses between 1 and 50),
  constraint household_join_links_use_count_is_valid check (use_count between 0 and max_uses)
);

create unique index household_join_links_one_current_per_household
  on public.household_join_links (household_id)
  where revoked_at is null;

create trigger household_join_links_set_updated_at
before update on public.household_join_links
for each row execute function public.set_updated_at();

alter table public.household_join_links enable row level security;
alter table public.household_join_links force row level security;
revoke all on table public.household_join_links from public, anon, authenticated;

create function private.add_default_categories(target_household_id uuid, actor_id uuid)
returns void
language sql
set search_path = pg_catalog, public, private
as $$
  insert into public.categories (household_id, name, color, created_by)
  select target_household_id, defaults.name, defaults.color, actor_id
  from (
    values
      ('Home', '#527A61'),
      ('Cleaning', '#397A8C'),
      ('Errands', '#7A6A9E'),
      ('Meals', '#B06B3C'),
      ('Pets', '#A66B73'),
      ('Kids', '#A47D27'),
      ('Health & medicine', '#4C718C'),
      ('Events', '#7D6A52')
  ) as defaults(name, color)
  where not exists (
    select 1
    from public.categories existing
    where existing.household_id = target_household_id
      and existing.archived_at is null
      and pg_catalog.lower(existing.name) = pg_catalog.lower(defaults.name)
  );
$$;

revoke all on function private.add_default_categories(uuid, uuid) from public, anon, authenticated;

select private.add_default_categories(household.id, household.created_by)
from public.households household
where household.deleted_at is null;

create or replace function public.create_household(input_name text, input_timezone text)
returns public.households
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  created_household public.households;
begin
  if actor_id is null or not private.is_approved_user(actor_id) then
    raise exception using errcode = '42501', message = 'approved platform access is required';
  end if;
  insert into public.households (name, timezone, created_by)
  values (pg_catalog.btrim(input_name), input_timezone, actor_id)
  returning * into created_household;
  insert into public.household_memberships (household_id, user_id, role, invited_by)
  values (created_household.id, actor_id, 'full_member', actor_id);
  perform private.add_default_categories(created_household.id, actor_id);
  return created_household;
end;
$$;

create function public.create_household_join_link(
  input_household_id uuid,
  input_role public.household_member_role default 'full_member',
  input_expires_in_hours integer default 168
)
returns table (
  join_link_id uuid,
  token text,
  expires_at timestamptz,
  role public.household_member_role,
  max_uses integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  raw_token text := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  created_link public.household_join_links;
begin
  if actor_id is null or not private.is_active_full_member(input_household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if input_expires_in_hours not between 1 and 720 then
    raise exception using errcode = '22023', message = 'link expiry must be between 1 hour and 30 days';
  end if;

  update public.household_join_links
  set revoked_at = pg_catalog.now()
  where household_id = input_household_id and revoked_at is null;

  insert into public.household_join_links (
    household_id, role, token_hash, expires_at, max_uses, created_by
  )
  values (
    input_household_id,
    input_role,
    pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    pg_catalog.now() + pg_catalog.make_interval(hours => input_expires_in_hours),
    12,
    actor_id
  )
  returning * into created_link;

  return query
    select created_link.id, raw_token, created_link.expires_at, created_link.role, created_link.max_uses::integer;
end;
$$;

create function public.get_household_join_link_status(input_household_id uuid)
returns table (
  join_link_id uuid,
  role public.household_member_role,
  expires_at timestamptz,
  use_count integer,
  max_uses integer
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select link.id, link.role, link.expires_at, link.use_count::integer, link.max_uses::integer
  from public.household_join_links link
  where link.household_id = input_household_id
    and link.revoked_at is null
    and link.expires_at > pg_catalog.now()
    and link.use_count < link.max_uses
    and private.is_active_full_member(input_household_id, auth.uid())
  limit 1;
$$;

create function public.revoke_household_join_link(input_join_link_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target_household_id uuid;
begin
  select link.household_id into target_household_id
  from public.household_join_links link
  where link.id = input_join_link_id;

  if target_household_id is null or actor_id is null or not private.is_active_full_member(target_household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;

  update public.household_join_links
  set revoked_at = pg_catalog.now()
  where id = input_join_link_id and revoked_at is null;
end;
$$;

create function public.accept_household_join_link(input_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target_link public.household_join_links;
  existing_membership_id uuid;
begin
  if actor_id is null or not private.is_approved_user(actor_id) then
    raise exception using errcode = '42501', message = 'approved platform access is required';
  end if;

  select * into target_link
  from public.household_join_links
  where token_hash = pg_catalog.encode(extensions.digest(input_token, 'sha256'), 'hex')
  for update;

  if target_link.id is null
    or target_link.revoked_at is not null
    or target_link.expires_at <= pg_catalog.now()
    or target_link.use_count >= target_link.max_uses then
    raise exception using errcode = '22023', message = 'join link is invalid, expired, or no longer active';
  end if;

  if exists (
    select 1 from public.household_memberships
    where household_id = target_link.household_id
      and user_id = actor_id
      and status = 'active'
  ) then
    return target_link.household_id;
  end if;

  select membership.id into existing_membership_id
  from public.household_memberships membership
  where membership.household_id = target_link.household_id
    and membership.user_id = actor_id
  order by membership.created_at desc
  limit 1
  for update;

  if existing_membership_id is null then
    insert into public.household_memberships (household_id, user_id, role, invited_by)
    values (target_link.household_id, actor_id, target_link.role, target_link.created_by);
  else
    update public.household_memberships
    set
      role = target_link.role,
      status = 'active',
      removed_at = null,
      joined_at = pg_catalog.now(),
      invited_by = target_link.created_by
    where id = existing_membership_id;
  end if;

  update public.household_join_links
  set use_count = use_count + 1
  where id = target_link.id;

  return target_link.household_id;
end;
$$;

revoke all on function public.create_household_join_link(uuid, public.household_member_role, integer) from public, anon;
revoke all on function public.get_household_join_link_status(uuid) from public, anon;
revoke all on function public.revoke_household_join_link(uuid) from public, anon;
revoke all on function public.accept_household_join_link(text) from public, anon;

grant execute on function public.create_household_join_link(uuid, public.household_member_role, integer) to authenticated;
grant execute on function public.get_household_join_link_status(uuid) to authenticated;
grant execute on function public.revoke_household_join_link(uuid) to authenticated;
grant execute on function public.accept_household_join_link(text) to authenticated;
