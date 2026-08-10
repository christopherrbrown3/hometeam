-- Keep signup policy in the database so administrators can change it without
-- redeploying the client. New signups require approval by default.
create table public.platform_settings (
  singleton boolean primary key default true,
  require_signup_approval boolean not null default true,
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid references public.profiles (user_id),
  constraint platform_settings_has_one_row check (singleton)
);

insert into public.platform_settings (singleton, require_signup_approval)
values (true, true);

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;
revoke all on table public.platform_settings from public, anon, authenticated;

-- Keep the platform-access state machine as the authorization boundary and
-- choose the initial state from the administrator-controlled signup policy.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  normalized_username text := private.username_from_auth_email(coalesce(new.email, ''));
  require_approval boolean;
  initial_status public.platform_access_status;
begin
  if normalized_username !~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$' then
    return new;
  end if;

  insert into public.profiles (user_id, display_name, username)
  values (new.id, pg_catalog.left(normalized_username, 80), normalized_username)
  on conflict (user_id) do nothing;

  select settings.require_signup_approval
  into require_approval
  from public.platform_settings as settings
  where settings.singleton;

  -- Fail closed if the singleton configuration row is ever missing.
  require_approval := coalesce(require_approval, true);
  initial_status := case
    when require_approval then 'pending'::public.platform_access_status
    else 'approved'::public.platform_access_status
  end;

  with created_access as (
    insert into public.platform_access (user_id, status, decided_at, reason)
    values (
      new.id,
      initial_status,
      case when initial_status = 'approved' then pg_catalog.now() else null end,
      case when initial_status = 'approved' then 'Automatic signup activation' else 'Signup approval required' end
    )
    on conflict (user_id) do nothing
    returning user_id, status
  )
  insert into public.platform_access_events (
    user_id,
    actor_user_id,
    previous_status,
    next_status
  )
  select user_id, null, null, status
  from created_access;

  return new;
end;
$$;

-- Fresh environments bootstrap their first administrator from an authenticated
-- account. The operation also restores that account when it is not yet active.
create or replace function private.bootstrap_platform_administrator(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_status public.platform_access_status;
begin
  if exists (select 1 from public.platform_administrators) then
    raise exception using errcode = '42501', message = 'a platform administrator already exists';
  end if;

  if not exists (select 1 from public.profiles where user_id = target_user_id) then
    raise exception using errcode = '22023', message = 'administrator must be an authenticated user';
  end if;

  select status
  into current_status
  from public.platform_access
  where user_id = target_user_id
  for update;

  if current_status is null then
    raise exception using errcode = '22023', message = 'administrator must have a platform access record';
  end if;

  insert into public.platform_administrators (user_id) values (target_user_id);

  if current_status <> 'approved' then
    update public.platform_access
    set
      status = 'approved',
      decided_at = pg_catalog.now(),
      decided_by = target_user_id,
      reason = 'Platform administrator bootstrap'
    where user_id = target_user_id;

    insert into public.platform_access_events (
      user_id,
      actor_user_id,
      previous_status,
      next_status
    )
    values (target_user_id, target_user_id, current_status, 'approved');
  end if;
end;
$$;

create function public.get_signup_approval_setting()
returns table (require_signup_approval boolean)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_platform_administrator(actor_id) then
    raise exception using errcode = '42501', message = 'platform administrator access is required';
  end if;

  return query
  select settings.require_signup_approval
  from public.platform_settings as settings
  where settings.singleton;
end;
$$;

create function public.set_signup_approval_setting(input_require_signup_approval boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_platform_administrator(actor_id) then
    raise exception using errcode = '42501', message = 'platform administrator access is required';
  end if;

  if input_require_signup_approval is null then
    raise exception using errcode = '22023', message = 'signup approval setting is required';
  end if;

  update public.platform_settings
  set
    require_signup_approval = input_require_signup_approval,
    updated_by = actor_id
  where singleton;

  if not found then
    raise exception using errcode = '55000', message = 'signup approval setting is unavailable';
  end if;

  return input_require_signup_approval;
end;
$$;

revoke all on function public.get_signup_approval_setting() from public, anon, authenticated;
revoke all on function public.set_signup_approval_setting(boolean) from public, anon, authenticated;
grant execute on function public.get_signup_approval_setting() to authenticated;
grant execute on function public.set_signup_approval_setting(boolean) to authenticated;
