create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.platform_access_status as enum (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

create type public.invitation_status as enum (
  'active',
  'accepted',
  'revoked',
  'expired'
);

create table public.platform_access (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  status public.platform_access_status not null default 'pending',
  requested_at timestamptz not null default pg_catalog.now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (user_id),
  reason text,
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.platform_administrators (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.platform_access_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id),
  actor_user_id uuid references public.profiles (user_id),
  previous_status public.platform_access_status,
  next_status public.platform_access_status not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint platform_access_events_transition_is_meaningful
    check (previous_status is distinct from next_status)
);

create table public.household_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_email text not null,
  role public.household_member_role not null,
  token_hash text not null unique,
  status public.invitation_status not null default 'active',
  expires_at timestamptz not null,
  invited_by uuid not null references public.profiles (user_id),
  accepted_by uuid references public.profiles (user_id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint household_invitations_email_is_normalized
    check (invited_email = pg_catalog.lower(pg_catalog.btrim(invited_email))),
  constraint household_invitations_expiry_is_future
    check (expires_at > created_at),
  constraint household_invitations_acceptance_matches_status
    check ((status = 'accepted') = (accepted_at is not null and accepted_by is not null)),
  constraint household_invitations_revocation_matches_status
    check ((status = 'revoked') = (revoked_at is not null))
);

create unique index household_invitations_one_active_email
  on public.household_invitations (household_id, invited_email)
  where status = 'active';

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  color text,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  archived_at timestamptz,
  constraint categories_name_not_blank check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 60),
  constraint categories_color_is_hex check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index categories_active_name_per_household
  on public.categories (household_id, pg_catalog.lower(name))
  where archived_at is null;

create unique index categories_id_household_id_key on public.categories (id, household_id);

alter table public.task_series
  add constraint task_series_category_household_fkey
  foreign key (category_id, household_id)
  references public.categories (id, household_id)
  deferrable initially immediate;

create trigger platform_access_set_updated_at
before update on public.platform_access
for each row execute function public.set_updated_at();

create trigger household_invitations_set_updated_at
before update on public.household_invitations
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create function private.is_approved_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.platform_access
    where user_id = target_user_id and status = 'approved'
  );
$$;

create function private.is_platform_administrator(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (select 1 from public.platform_administrators where user_id = target_user_id);
$$;

create function private.is_active_member(target_household_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.is_approved_user(target_user_id) and exists (
    select 1 from public.household_memberships
    where household_id = target_household_id
      and user_id = target_user_id
      and status = 'active'
      and removed_at is null
  );
$$;

create function private.is_active_full_member(target_household_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.is_active_member(target_household_id, target_user_id) and exists (
    select 1 from public.household_memberships
    where household_id = target_household_id and user_id = target_user_id
      and role = 'full_member' and status = 'active' and removed_at is null
  );
$$;

create function private.prevent_profile_identity_rewrite()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.user_id is distinct from old.user_id or new.email is distinct from old.email then
    raise exception using errcode = '42501', message = 'profile identity fields cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_identity_rewrite
before update on public.profiles
for each row execute function private.prevent_profile_identity_rewrite();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  normalized_email text := pg_catalog.lower(coalesce(new.email, ''));
  default_name text := pg_catalog.split_part(coalesce(new.email, 'HomeTeam member'), '@', 1);
begin
  if normalized_email = '' then
    return new;
  end if;
  insert into public.profiles (user_id, display_name, email)
  values (new.id, pg_catalog.left(default_name, 80), normalized_email)
  on conflict (user_id) do nothing;
  insert into public.platform_access (user_id, status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- This function is intentionally not granted to browser roles. Run it once from a
-- trusted database session after the first operator has authenticated.
create function private.bootstrap_platform_administrator(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if exists (select 1 from public.platform_administrators) then
    raise exception using errcode = '42501', message = 'a platform administrator already exists';
  end if;
  if not exists (select 1 from public.profiles where user_id = target_user_id) then
    raise exception using errcode = '22023', message = 'administrator must be an authenticated user';
  end if;
  insert into public.platform_administrators (user_id) values (target_user_id);
  update public.platform_access
    set status = 'approved', decided_at = pg_catalog.now(), decided_by = target_user_id
    where user_id = target_user_id;
  insert into public.platform_access_events (user_id, actor_user_id, previous_status, next_status)
    values (target_user_id, target_user_id, 'pending', 'approved');
end;
$$;

create function public.create_household(input_name text, input_timezone text)
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
  return created_household;
end;
$$;

create function public.set_platform_access_status(target_user_id uuid, target_status public.platform_access_status, decision_reason text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  old_status public.platform_access_status;
begin
  if actor_id is null or not private.is_platform_administrator(actor_id) then
    raise exception using errcode = '42501', message = 'platform administrator access is required';
  end if;
  select status into old_status from public.platform_access where user_id = target_user_id for update;
  if old_status is null then
    raise exception using errcode = '22023', message = 'platform access record was not found';
  end if;
  if old_status = target_status then
    raise exception using errcode = '22023', message = 'platform access is already in that state';
  end if;
  update public.platform_access
  set status = target_status, decided_at = pg_catalog.now(), decided_by = actor_id, reason = nullif(pg_catalog.btrim(decision_reason), '')
  where user_id = target_user_id;
  insert into public.platform_access_events (user_id, actor_user_id, previous_status, next_status)
  values (target_user_id, actor_id, old_status, target_status);
end;
$$;

create function public.create_household_invitation(input_household_id uuid, input_email text, input_role public.household_member_role, input_expires_in_hours integer default 168)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(input_email));
  raw_token text := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  invitation public.household_invitations;
begin
  if actor_id is null or not private.is_active_full_member(input_household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'a valid invitation email is required';
  end if;
  if input_expires_in_hours not between 1 and 720 then
    raise exception using errcode = '22023', message = 'invitation expiry must be between 1 hour and 30 days';
  end if;
  update public.household_invitations
    set status = 'revoked', revoked_at = pg_catalog.now()
    where household_id = input_household_id and invited_email = normalized_email and status = 'active';
  insert into public.household_invitations (household_id, invited_email, role, token_hash, expires_at, invited_by)
  values (input_household_id, normalized_email, input_role, pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex'), pg_catalog.now() + pg_catalog.make_interval(hours => input_expires_in_hours), actor_id)
  returning * into invitation;
  return query select invitation.id, raw_token, invitation.expires_at;
end;
$$;

create function public.revoke_household_invitation(input_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); begin
  update public.household_invitations i set status = 'revoked', revoked_at = pg_catalog.now()
  where i.id = input_invitation_id and i.status = 'active'
    and private.is_active_full_member(i.household_id, actor_id);
  if not found then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
end;
$$;

create function public.accept_household_invitation(input_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  invitation public.household_invitations;
begin
  if actor_id is null or not private.is_approved_user(actor_id) then
    raise exception using errcode = '42501', message = 'approved platform access is required';
  end if;
  select pg_catalog.lower(email) into actor_email from public.profiles where user_id = actor_id;
  select * into invitation from public.household_invitations
    where token_hash = pg_catalog.encode(extensions.digest(input_token, 'sha256'), 'hex') for update;
  if invitation.id is null or invitation.status <> 'active' or invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'invitation is invalid, expired, or no longer active';
  end if;
  if invitation.invited_email <> actor_email then
    raise exception using errcode = '42501', message = 'invitation email does not match the signed-in account';
  end if;
  insert into public.household_memberships (household_id, user_id, role, invited_by)
  values (invitation.household_id, actor_id, invitation.role, invitation.invited_by);
  update public.household_invitations set status = 'accepted', accepted_by = actor_id, accepted_at = pg_catalog.now()
    where id = invitation.id;
  return invitation.household_id;
end;
$$;

create function public.list_household_invitations(input_household_id uuid)
returns table (id uuid, invited_email text, role public.household_member_role, status public.invitation_status, expires_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select i.id, i.invited_email, i.role, i.status, i.expires_at, i.created_at
  from public.household_invitations i
  where i.household_id = input_household_id
    and private.is_active_full_member(input_household_id, auth.uid())
  order by i.created_at desc;
$$;

create function public.create_category(input_household_id uuid, input_name text, input_color text default null)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); created_category public.categories; begin
  if actor_id is null or not private.is_active_full_member(input_household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  insert into public.categories (household_id, name, color, created_by)
  values (input_household_id, pg_catalog.btrim(input_name), input_color, actor_id) returning * into created_category;
  return created_category;
end;
$$;

create function public.update_category(input_category_id uuid, input_name text, input_color text default null, archive boolean default false)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); changed_category public.categories; begin
  update public.categories c
  set name = pg_catalog.btrim(input_name), color = input_color,
      archived_at = case when archive then pg_catalog.now() else null end
  where c.id = input_category_id and private.is_active_full_member(c.household_id, actor_id)
  returning * into changed_category;
  if changed_category.id is null then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  return changed_category;
end;
$$;

alter table public.platform_access enable row level security;
alter table public.platform_access force row level security;
alter table public.platform_administrators enable row level security;
alter table public.platform_administrators force row level security;
alter table public.platform_access_events enable row level security;
alter table public.platform_access_events force row level security;
alter table public.household_invitations enable row level security;
alter table public.household_invitations force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.platform_access, public.households, public.household_memberships, public.categories,
  public.task_series, public.task_schedule_slots, public.task_rotation_members, public.task_occurrences, public.task_events to authenticated;

create policy profiles_own_or_shared_full_membership on public.profiles for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_platform_administrator(auth.uid())) or exists (
    select 1 from public.household_memberships own join public.household_memberships target
      on target.household_id = own.household_id
    where own.user_id = (select auth.uid()) and own.role = 'full_member' and own.status = 'active' and own.removed_at is null
      and target.user_id = profiles.user_id and target.status = 'active' and target.removed_at is null
      and (select private.is_approved_user(auth.uid()))
  )
);
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy platform_access_own_or_admin on public.platform_access for select to authenticated using (user_id = (select auth.uid()) or (select private.is_platform_administrator(auth.uid())));
create policy households_active_member on public.households for select to authenticated using ((select private.is_active_member(id, auth.uid())) and deleted_at is null);
create policy memberships_own_or_full_member on public.household_memberships for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_active_full_member(household_id, auth.uid()))
);
create policy categories_full_member on public.categories for select to authenticated using ((select private.is_active_full_member(household_id, auth.uid())) and archived_at is null);
create policy task_series_full_member on public.task_series for select to authenticated using ((select private.is_active_full_member(household_id, auth.uid())) and deleted_at is null);
create policy task_slots_full_member on public.task_schedule_slots for select to authenticated using (exists (select 1 from public.task_series s where s.id = series_id and private.is_active_full_member(s.household_id, auth.uid())));
create policy task_rotation_full_member on public.task_rotation_members for select to authenticated using (exists (select 1 from public.task_series s where s.id = series_id and private.is_active_full_member(s.household_id, auth.uid())));
create policy occurrences_member_or_assigned_guest on public.task_occurrences for select to authenticated using (
  (select private.is_active_full_member(household_id, auth.uid())) or (
    assignee_user_id = (select auth.uid()) and (select private.is_active_member(household_id, auth.uid()))
  )
);
create policy events_full_member_only on public.task_events for select to authenticated using ((select private.is_active_full_member(household_id, auth.uid())));

revoke all on function private.is_approved_user(uuid), private.is_platform_administrator(uuid), private.is_active_member(uuid, uuid), private.is_active_full_member(uuid, uuid), private.bootstrap_platform_administrator(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_approved_user(uuid), private.is_platform_administrator(uuid), private.is_active_member(uuid, uuid), private.is_active_full_member(uuid, uuid) to authenticated;
revoke all on function public.create_household(text, text), public.set_platform_access_status(uuid, public.platform_access_status, text), public.create_household_invitation(uuid, text, public.household_member_role, integer), public.revoke_household_invitation(uuid), public.accept_household_invitation(text), public.list_household_invitations(uuid), public.create_category(uuid, text, text), public.update_category(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_household(text, text), public.set_platform_access_status(uuid, public.platform_access_status, text), public.create_household_invitation(uuid, text, public.household_member_role, integer), public.revoke_household_invitation(uuid), public.accept_household_invitation(text), public.list_household_invitations(uuid), public.create_category(uuid, text, text), public.update_category(uuid, text, text, boolean) to authenticated;
