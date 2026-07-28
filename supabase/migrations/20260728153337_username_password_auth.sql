-- Supabase Auth uses an email-shaped identifier for its password provider. The
-- application derives a non-routable internal identifier from the username;
-- usernames, not that implementation detail, are the product identity.

alter table public.profiles add column username text;

update public.profiles
set username = pg_catalog.lower(pg_catalog.split_part(email, '@', 1));

alter table public.profiles
  alter column username set not null,
  drop constraint profiles_email_not_blank,
  drop column email,
  add constraint profiles_username_is_normalized
    check (username = pg_catalog.lower(pg_catalog.btrim(username))),
  add constraint profiles_username_has_supported_format
    check (username ~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$');

create unique index profiles_username_key on public.profiles (username);

alter table public.household_invitations add column invited_username text;

update public.household_invitations
set invited_username = pg_catalog.lower(pg_catalog.split_part(invited_email, '@', 1));

drop index public.household_invitations_one_active_email;

alter table public.household_invitations
  alter column invited_username set not null,
  drop constraint household_invitations_email_is_normalized,
  drop column invited_email;

alter table public.household_invitations
  add constraint household_invitations_username_is_normalized
    check (invited_username = pg_catalog.lower(pg_catalog.btrim(invited_username))),
  add constraint household_invitations_username_has_supported_format
    check (invited_username ~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$');

create unique index household_invitations_one_active_username
  on public.household_invitations (household_id, invited_username)
  where status = 'active';

create or replace function private.username_from_auth_email(auth_email text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when pg_catalog.lower(auth_email) ~ '^u-[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]@auth\.hometeam\.invalid$'
      then pg_catalog.regexp_replace(pg_catalog.lower(auth_email), '^u-([a-z0-9][a-z0-9_-]{1,30}[a-z0-9])@auth\.hometeam\.invalid$', '\1')
    else pg_catalog.lower(pg_catalog.split_part(auth_email, '@', 1))
  end;
$$;

create or replace function private.prevent_profile_identity_rewrite()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.user_id is distinct from old.user_id or new.username is distinct from old.username then
    raise exception using errcode = '42501', message = 'profile identity fields cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  normalized_username text := private.username_from_auth_email(coalesce(new.email, ''));
begin
  if normalized_username !~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$' then
    return new;
  end if;
  insert into public.profiles (user_id, display_name, username)
  values (new.id, pg_catalog.left(normalized_username, 80), normalized_username)
  on conflict (user_id) do nothing;
  insert into public.platform_access (user_id, status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop function public.create_household_invitation(uuid, text, public.household_member_role, integer);

create function public.create_household_invitation(input_household_id uuid, input_username text, input_role public.household_member_role, input_expires_in_hours integer default 168)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  normalized_username text := pg_catalog.lower(pg_catalog.btrim(input_username));
  raw_token text := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  invitation public.household_invitations;
begin
  if actor_id is null or not private.is_active_full_member(input_household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if normalized_username !~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$' then
    raise exception using errcode = '22023', message = 'a valid invitation username is required';
  end if;
  if input_expires_in_hours not between 1 and 720 then
    raise exception using errcode = '22023', message = 'invitation expiry must be between 1 hour and 30 days';
  end if;
  update public.household_invitations
    set status = 'revoked', revoked_at = pg_catalog.now()
    where household_id = input_household_id and invited_username = normalized_username and status = 'active';
  insert into public.household_invitations (household_id, invited_username, role, token_hash, expires_at, invited_by)
  values (input_household_id, normalized_username, input_role, pg_catalog.encode(extensions.digest(raw_token, 'sha256'), 'hex'), pg_catalog.now() + pg_catalog.make_interval(hours => input_expires_in_hours), actor_id)
  returning * into invitation;
  return query select invitation.id, raw_token, invitation.expires_at;
end;
$$;

create or replace function public.accept_household_invitation(input_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_username text;
  invitation public.household_invitations;
begin
  if actor_id is null or not private.is_approved_user(actor_id) then
    raise exception using errcode = '42501', message = 'approved platform access is required';
  end if;
  select username into actor_username from public.profiles where user_id = actor_id;
  select * into invitation from public.household_invitations
    where token_hash = pg_catalog.encode(extensions.digest(input_token, 'sha256'), 'hex') for update;
  if invitation.id is null or invitation.status <> 'active' or invitation.expires_at <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'invitation is invalid, expired, or no longer active';
  end if;
  if invitation.invited_username <> actor_username then
    raise exception using errcode = '42501', message = 'invitation username does not match the signed-in account';
  end if;
  insert into public.household_memberships (household_id, user_id, role, invited_by)
  values (invitation.household_id, actor_id, invitation.role, invitation.invited_by);
  update public.household_invitations set status = 'accepted', accepted_by = actor_id, accepted_at = pg_catalog.now()
    where id = invitation.id;
  return invitation.household_id;
end;
$$;

drop function public.list_household_invitations(uuid);

create function public.list_household_invitations(input_household_id uuid)
returns table (id uuid, invited_username text, role public.household_member_role, status public.invitation_status, expires_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select i.id, i.invited_username, i.role, i.status, i.expires_at, i.created_at
  from public.household_invitations i
  where i.household_id = input_household_id
    and private.is_active_full_member(input_household_id, auth.uid())
  order by i.created_at desc;
$$;

grant execute on function public.list_household_invitations(uuid) to authenticated;
grant execute on function public.create_household_invitation(uuid, text, public.household_member_role, integer) to authenticated;
