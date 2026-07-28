-- Milestone 5: assignments are authoritative database state.  The cursor is
-- advanced by lifecycle work (Milestone 6); generation and recalculation use
-- it as the stable starting point without rewriting historical assignments.

alter table public.task_series
  add column rotation_cursor_user_id uuid references public.profiles (user_id),
  add column rotation_cursor_updated_at timestamptz;

create function private.validate_task_series_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.assignment_mode = 'fixed' then
    if new.fixed_assignee_id is null or not exists (
      select 1 from public.household_memberships m
      where m.household_id = new.household_id and m.user_id = new.fixed_assignee_id
        and m.status = 'active' and m.removed_at is null
    ) then
      raise exception using errcode = '23514', message = 'a fixed assignee must be an active household member';
    end if;
  elsif new.fixed_assignee_id is not null then
    raise exception using errcode = '23514', message = 'only fixed task series may retain a fixed assignee';
  end if;
  return new;
end;
$$;

create trigger task_series_validate_assignment
before insert or update of assignment_mode, fixed_assignee_id, household_id on public.task_series
for each row execute function private.validate_task_series_assignment();

create function private.is_active_rotation_member(input_series_id uuid, input_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select input_user_id is not null and exists (
    select 1
    from public.task_rotation_members r
    join public.task_series s on s.id = r.series_id
    where r.series_id = input_series_id
      and r.user_id = input_user_id
      and r.is_active
      and private.is_active_member(s.household_id, input_user_id)
  );
$$;

create function private.next_rotation_assignee(input_series_id uuid, input_after_user_id uuid default null)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  after_position integer;
  selected_user_id uuid;
begin
  select r.rotation_position into after_position
  from public.task_rotation_members r
  join public.task_series s on s.id = r.series_id
  where r.series_id = input_series_id and r.user_id = input_after_user_id and r.is_active
    and private.is_active_member(s.household_id, r.user_id);

  if after_position is not null then
    select r.user_id into selected_user_id
    from public.task_rotation_members r
    join public.task_series s on s.id = r.series_id
    where r.series_id = input_series_id and r.is_active
      and private.is_active_member(s.household_id, r.user_id)
    order by (r.rotation_position <= after_position), r.rotation_position
    limit 1;
  else
    select r.user_id into selected_user_id
    from public.task_rotation_members r
    join public.task_series s on s.id = r.series_id
    where r.series_id = input_series_id and r.is_active
      and private.is_active_member(s.household_id, r.user_id)
    order by r.rotation_position
    limit 1;
  end if;
  return selected_user_id;
end;
$$;

create function private.rotation_basis_before(input_series_id uuid, input_due_start timestamptz)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce(
    (
      select o.assignee_user_id
      from public.task_occurrences o
      where o.series_id = input_series_id
        and o.assignee_user_id is not null
        and o.lifecycle_state <> 'deleted'
        and o.original_due_start < input_due_start
        and private.is_active_rotation_member(input_series_id, o.assignee_user_id)
      order by o.original_due_start desc, o.id desc
      limit 1
    ),
    (select s.rotation_cursor_user_id from public.task_series s where s.id = input_series_id)
  );
$$;

create function private.write_assignment_event(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_event_type public.task_event_type,
  input_before_assignee_id uuid,
  input_reason text
)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  insert into public.task_events (household_id, series_id, occurrence_id, actor_user_id, event_type, event_payload)
  values (
    input_occurrence.household_id,
    input_occurrence.series_id,
    input_occurrence.id,
    input_actor_id,
    input_event_type,
    pg_catalog.jsonb_build_object(
      'version', 1,
      'reason', input_reason,
      'beforeAssigneeId', input_before_assignee_id,
      'afterAssigneeId', input_occurrence.assignee_user_id,
      'assignmentSource', input_occurrence.assignment_source,
      'assignmentLocked', input_occurrence.assignment_locked
    )
  );
$$;

create function private.recalculate_rotation_assignments(
  input_series_id uuid,
  input_actor_id uuid,
  input_cursor_user_id uuid default null,
  input_reason text default 'rotation_recalculated'
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target public.task_series;
  candidate public.task_occurrences;
  cursor_user_id uuid;
  next_assignee_id uuid;
  previous_assignee_id uuid;
  changed_count integer := 0;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or target.assignment_mode <> 'round_robin' then
    raise exception using errcode = '22023', message = 'a round-robin task series is required';
  end if;
  if input_cursor_user_id is not null and not private.is_active_rotation_member(target.id, input_cursor_user_id) then
    raise exception using errcode = '22023', message = 'the rotation cursor must be an active roster member';
  end if;

  cursor_user_id := coalesce(input_cursor_user_id, target.rotation_cursor_user_id);
  for candidate in
    select * from public.task_occurrences
    where series_id = target.id
      and lifecycle_state = 'open'
      and deleted_at is null
      and original_due_start >= pg_catalog.now()
    order by original_due_start, id
    for update
  loop
    if candidate.assignment_locked or candidate.assignment_source <> 'round_robin' then
      if private.is_active_rotation_member(target.id, candidate.assignee_user_id) then
        cursor_user_id := candidate.assignee_user_id;
      end if;
      continue;
    end if;
    next_assignee_id := private.next_rotation_assignee(target.id, cursor_user_id);
    if next_assignee_id is null then
      raise exception using errcode = '22023', message = 'round-robin tasks require at least one active roster member';
    end if;
    if candidate.assignee_user_id is distinct from next_assignee_id then
      previous_assignee_id := candidate.assignee_user_id;
      update public.task_occurrences
      set assignee_user_id = next_assignee_id,
          assignment_source = 'round_robin',
          version = version + 1
      where id = candidate.id
      returning * into candidate;
      perform private.write_assignment_event(candidate, input_actor_id, 'assigned', previous_assignee_id, input_reason);
      changed_count := changed_count + 1;
    end if;
    cursor_user_id := next_assignee_id;
  end loop;

  update public.task_series
  set rotation_cursor_user_id = coalesce(input_cursor_user_id, rotation_cursor_user_id),
      rotation_cursor_updated_at = case when input_cursor_user_id is null then rotation_cursor_updated_at else pg_catalog.now() end
  where id = target.id;

  insert into public.task_events (household_id, series_id, actor_user_id, event_type, event_payload)
  values (
    target.household_id,
    target.id,
    input_actor_id,
    'rotation_recalculated',
    pg_catalog.jsonb_build_object('version', 1, 'reason', input_reason, 'recalculatedCount', changed_count, 'cursorUserId', cursor_user_id)
  );
  return changed_count;
end;
$$;

create function public.claim_occurrence(input_occurrence_id uuid, input_expected_version bigint)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_occurrences;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then
    raise exception using errcode = '22023', message = 'only open occurrences can be claimed';
  end if;
  if target.version <> input_expected_version then
    raise exception using errcode = '40001', message = 'stale occurrence version';
  end if;
  if target.assignee_user_id is not null then
    raise exception using errcode = '23505', message = 'the occurrence is already assigned';
  end if;
  update public.task_occurrences
  set assignee_user_id = actor_id, assignment_source = 'claimed', assignment_locked = false, version = version + 1
  where id = target.id
  returning * into target;
  perform private.write_assignment_event(target, actor_id, 'claimed', null, 'claim');
  return target;
end;
$$;

create function public.assign_occurrence(
  input_occurrence_id uuid,
  input_assignee_user_id uuid,
  input_expected_version bigint,
  input_lock boolean default false
)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_occurrences;
  previous_assignee_id uuid;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then
    raise exception using errcode = '22023', message = 'only open occurrences can be assigned';
  end if;
  if target.version <> input_expected_version then
    raise exception using errcode = '40001', message = 'stale occurrence version';
  end if;
  if input_assignee_user_id is not null and not private.is_active_member(target.household_id, input_assignee_user_id) then
    raise exception using errcode = '22023', message = 'the assignee must be an active household member';
  end if;
  previous_assignee_id := target.assignee_user_id;
  update public.task_occurrences
  set assignee_user_id = input_assignee_user_id,
      assignment_source = case when input_assignee_user_id is null then 'unassigned'::public.task_assignment_source else 'manual'::public.task_assignment_source end,
      assignment_locked = case when input_assignee_user_id is null then false else input_lock end,
      version = version + 1
  where id = target.id
  returning * into target;
  perform private.write_assignment_event(target, actor_id, case when previous_assignee_id is null then 'assigned'::public.task_event_type else 'reassigned'::public.task_event_type end, previous_assignee_id, 'manual_assignment');
  return target;
end;
$$;

create function public.set_occurrence_assignment_lock(input_occurrence_id uuid, input_expected_version bigint, input_locked boolean)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null or target.assignee_user_id is null then
    raise exception using errcode = '22023', message = 'only assigned open occurrences can be locked';
  end if;
  if target.version <> input_expected_version then
    raise exception using errcode = '40001', message = 'stale occurrence version';
  end if;
  update public.task_occurrences set assignment_locked = input_locked, version = version + 1 where id = target.id returning * into target;
  perform private.write_assignment_event(target, actor_id, 'reassigned', target.assignee_user_id, 'assignment_lock_changed');
  return target;
end;
$$;

create function public.recalculate_future_assignments(input_series_id uuid, input_cursor_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  return private.recalculate_rotation_assignments(target.id, actor_id, input_cursor_user_id);
end;
$$;

create function public.replace_rotation_roster(input_series_id uuid, input_member_ids uuid[])
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
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.assignment_mode <> 'round_robin' then
    raise exception using errcode = '22023', message = 'only round-robin task series have a roster';
  end if;
  if coalesce(pg_catalog.array_length(input_member_ids, 1), 0) < 1
    or pg_catalog.array_length(input_member_ids, 1) > 50
    or (select count(distinct value) from pg_catalog.unnest(input_member_ids) value) <> pg_catalog.array_length(input_member_ids, 1) then
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
      set rotation_position = excluded.rotation_position, is_active = true;
    position := position + 1;
  end loop;
  return private.recalculate_rotation_assignments(target.id, actor_id, null, 'roster_changed');
end;
$$;

create or replace function public.generate_calendar_occurrences(
  input_from date,
  input_through date
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target public.task_series;
  slot record;
  local_day date;
  due_start timestamptz;
  due_end timestamptz;
  generated integer := 0;
  key_value text;
  generated_assignee_id uuid;
  generated_source public.task_assignment_source;
begin
  if input_from > input_through or input_through - input_from > 366 then
    raise exception using errcode = '22023', message = 'generation range must be ordered and at most 366 days';
  end if;
  for target in
    select * from public.task_series
    where recurrence_type = 'calendar' and series_status = 'active' and deleted_at is null
  loop
    for local_day in select generated_day::date from pg_catalog.generate_series(input_from, input_through, interval '1 day') as generated(generated_day)
    loop
      if not private.series_can_generate(target, local_day) then continue; end if;
      if target.recurrence_config->>'frequency' = 'weekly'
        and not exists (select 1 from pg_catalog.jsonb_array_elements_text(target.recurrence_config->'weekdays') day_number where day_number::integer = pg_catalog.date_part('dow', local_day)::integer)
      then continue; end if;
      for slot in select * from public.task_schedule_slots where series_id = target.id order by sort_order
      loop
        key_value := pg_catalog.to_char(local_day, 'YYYY-MM-DD') || '|' || case when slot.is_all_day then 'all-day' else pg_catalog.to_char(slot.local_start_time, 'HH24:MI') || '-' || pg_catalog.to_char(coalesce(slot.local_end_time, slot.local_start_time), 'HH24:MI') end || '|' || slot.end_day_offset || '|' || slot.sort_order;
        if slot.is_all_day then
          due_start := local_day::timestamp at time zone (select timezone from public.households where id = target.household_id);
          due_end := (local_day + 1)::timestamp at time zone (select timezone from public.households where id = target.household_id);
        else
          due_start := (local_day + slot.local_start_time) at time zone (select timezone from public.households where id = target.household_id);
          due_end := (local_day + slot.end_day_offset + coalesce(slot.local_end_time, slot.local_start_time)) at time zone (select timezone from public.households where id = target.household_id);
        end if;
        generated_assignee_id := case target.assignment_mode
          when 'fixed' then target.fixed_assignee_id
          when 'round_robin' then private.next_rotation_assignee(target.id, private.rotation_basis_before(target.id, due_start))
          else null
        end;
        -- A paused/unavailable roster must not prevent the scheduler from
        -- generating unrelated series. The roster editor prevents new empty
        -- rosters; this guard safely skips legacy or temporarily ineligible rows.
        if target.assignment_mode = 'round_robin' and generated_assignee_id is null then continue; end if;
        generated_source := case target.assignment_mode
          when 'fixed' then 'fixed'::public.task_assignment_source
          when 'round_robin' then 'round_robin'::public.task_assignment_source
          else 'unassigned'::public.task_assignment_source
        end;
        insert into public.task_occurrences (series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day, assignee_user_id, assignment_source)
        values (target.id, target.household_id, key_value, due_start, due_end, slot.is_all_day, generated_assignee_id, generated_source)
        on conflict (series_id, occurrence_key) do nothing;
        if found then generated := generated + 1; end if;
      end loop;
    end loop;
  end loop;
  return generated;
end;
$$;

revoke all on function private.is_active_rotation_member(uuid, uuid), private.next_rotation_assignee(uuid, uuid), private.rotation_basis_before(uuid, timestamptz), private.write_assignment_event(public.task_occurrences, uuid, public.task_event_type, uuid, text), private.recalculate_rotation_assignments(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.claim_occurrence(uuid, bigint), public.assign_occurrence(uuid, uuid, bigint, boolean), public.set_occurrence_assignment_lock(uuid, bigint, boolean), public.recalculate_future_assignments(uuid, uuid), public.replace_rotation_roster(uuid, uuid[]) from public, anon;
grant execute on function public.claim_occurrence(uuid, bigint), public.assign_occurrence(uuid, uuid, bigint, boolean), public.set_occurrence_assignment_lock(uuid, bigint, boolean), public.recalculate_future_assignments(uuid, uuid), public.replace_rotation_roster(uuid, uuid[]) to authenticated;
