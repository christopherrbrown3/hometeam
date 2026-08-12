-- P2 security fixes: approval-bound guest mutations, redacted history access,
-- fragment-only join links, and strict one-dimensional rotation rosters.

create or replace function private.can_mutate_occurrence_lifecycle(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_allow_guest boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select input_actor_id is not null
    and private.is_approved_user(input_actor_id)
    and (
      private.is_active_full_member(input_occurrence.household_id, input_actor_id)
      or (
        input_allow_guest
        and input_occurrence.assignee_user_id = input_actor_id
        and exists (
          select 1
          from public.household_memberships m
          where m.household_id = input_occurrence.household_id
            and m.user_id = input_actor_id
            and m.role = 'guest'
            and m.status = 'active'
            and m.removed_at is null
        )
      )
    );
$$;

create or replace function private.guest_safe_task_event_payload(
  input_event_type public.task_event_type,
  input_payload jsonb
)
returns jsonb
language sql
immutable
security invoker
set search_path = pg_catalog, public, private
as $$
  select case input_event_type
    when 'snoozed'::public.task_event_type then
      case when input_payload ? 'snoozedUntil'
        then pg_catalog.jsonb_build_object('snoozedUntil', input_payload->'snoozedUntil')
        else '{}'::jsonb
      end
    when 'snooze_changed'::public.task_event_type then
      case when input_payload ? 'snoozedUntil'
        then pg_catalog.jsonb_build_object('snoozedUntil', input_payload->'snoozedUntil')
        else '{}'::jsonb
      end
    when 'series_updated'::public.task_event_type then
      case when input_payload ? 'scope'
        then pg_catalog.jsonb_build_object('scope', input_payload->'scope')
        else '{}'::jsonb
      end
    when 'series_paused'::public.task_event_type then
      case when input_payload ? 'skippedOverdueOccurrences'
        then pg_catalog.jsonb_build_object('skippedOverdueOccurrences', input_payload->'skippedOverdueOccurrences')
        else '{}'::jsonb
      end
    else '{}'::jsonb
  end;
$$;

revoke all on function private.guest_safe_task_event_payload(public.task_event_type, jsonb)
from public, anon, authenticated;

drop policy if exists events_assigned_guest_read on public.task_events;
revoke all on table public.task_events from public, anon, authenticated;

create function public.list_history(input_household_id uuid default null)
returns table (
  id uuid,
  household_id uuid,
  series_id uuid,
  occurrence_id uuid,
  actor_user_id uuid,
  event_type public.task_event_type,
  event_payload jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.is_approved_user(actor_id) then
    raise exception using errcode = '42501', message = 'approved account is required';
  end if;

  return query
  select
    e.id,
    e.household_id,
    e.series_id,
    e.occurrence_id,
    case when private.is_active_full_member(e.household_id, actor_id)
      then e.actor_user_id
      else null::uuid
    end,
    e.event_type,
    case when private.is_active_full_member(e.household_id, actor_id)
      then e.event_payload
      else private.guest_safe_task_event_payload(e.event_type, e.event_payload)
    end,
    e.created_at
  from public.task_events e
  where (input_household_id is null or e.household_id = input_household_id)
    and (
      private.is_active_full_member(e.household_id, actor_id)
      or exists (
        select 1
        from public.task_occurrences o
        join public.household_memberships m on m.household_id = o.household_id
        where o.id = e.occurrence_id
          and o.assignee_user_id = actor_id
          and m.user_id = actor_id
          and m.role = 'guest'
          and m.status = 'active'
          and m.removed_at is null
      )
    )
  order by e.created_at desc, e.id desc
  limit 200;
end;
$$;

revoke all on function public.list_history(uuid) from public, anon, authenticated;
grant execute on function public.list_history(uuid) to authenticated;

create or replace function public.replace_rotation_roster(
  input_series_id uuid,
  input_member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_series;
  member_id uuid;
  position integer := 0;
  local_today date;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.assignment_mode <> 'round_robin' then
    raise exception using errcode = '22023', message = 'only round-robin task series have a roster';
  end if;
  if coalesce(pg_catalog.array_ndims(input_member_ids), 0) <> 1
    or coalesce(pg_catalog.cardinality(input_member_ids), 0) < 1
    or pg_catalog.cardinality(input_member_ids) > 50
    or (
      select count(distinct value)
      from pg_catalog.unnest(input_member_ids) value
    ) <> pg_catalog.cardinality(input_member_ids)
  then
    raise exception using errcode = '22023', message = 'the rotation roster must contain one to fifty unique members';
  end if;

  foreach member_id in array input_member_ids loop
    if not private.is_active_member(target.household_id, member_id) then
      raise exception using errcode = '22023', message = 'every roster member must be an active household member';
    end if;
  end loop;

  update public.task_rotation_members set is_active = false where series_id = target.id;
  foreach member_id in array input_member_ids loop
    insert into public.task_rotation_members (series_id, user_id, rotation_position, is_active)
    values (target.id, member_id, position, true)
    on conflict (series_id, user_id) do update
      set rotation_position = excluded.rotation_position,
          is_active = true;
    position := position + 1;
  end loop;

  if target.recurrence_type = 'calendar' then
    select (pg_catalog.now() at time zone h.timezone)::date
    into local_today
    from public.households h
    where h.id = target.household_id;
    perform private.generate_calendar_occurrences_for_series(
      target.id,
      target.effective_from,
      greatest(target.effective_from, local_today + 90)
    );
  end if;

  return private.recalculate_rotation_assignments(target.id, actor_id, null, 'roster_changed');
end;
$$;
