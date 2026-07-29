-- A task series is only a definition. Materialize non-calendar tasks during
-- the same save transaction so a newly saved task is immediately visible to
-- the read models. Calendar tasks retain their bounded-horizon generator.
create function private.materialize_initial_occurrences(input_series public.task_series)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  slot record;
  due_start timestamptz;
  due_end timestamptz;
  generated_key text;
  assignee_id uuid;
  assignment_source public.task_assignment_source;
  created_count integer := 0;
  household_timezone text;
begin
  if input_series.recurrence_type = 'calendar'
    or input_series.series_status <> 'active'
    or input_series.deleted_at is not null
    or exists (select 1 from public.task_occurrences occurrence where occurrence.series_id = input_series.id)
    or not private.series_can_generate(input_series, input_series.effective_from) then
    return 0;
  end if;

  select timezone into household_timezone from public.households where id = input_series.household_id;
  for slot in select * from public.task_schedule_slots where series_id = input_series.id order by sort_order
  loop
    generated_key := pg_catalog.to_char(input_series.effective_from, 'YYYY-MM-DD') || '|' || case
      when slot.is_all_day then 'all-day'
      else pg_catalog.to_char(slot.local_start_time, 'HH24:MI') || '-' || pg_catalog.to_char(coalesce(slot.local_end_time, slot.local_start_time), 'HH24:MI')
    end || '|' || slot.end_day_offset || '|' || slot.sort_order;
    if slot.is_all_day then
      due_start := input_series.effective_from::timestamp at time zone household_timezone;
      due_end := (input_series.effective_from + 1)::timestamp at time zone household_timezone;
    else
      due_start := (input_series.effective_from + slot.local_start_time) at time zone household_timezone;
      due_end := (input_series.effective_from + slot.end_day_offset + coalesce(slot.local_end_time, slot.local_start_time)) at time zone household_timezone;
    end if;

    assignee_id := case input_series.assignment_mode
      when 'fixed' then input_series.fixed_assignee_id
      when 'round_robin' then private.next_rotation_assignee(input_series.id, private.rotation_basis_before(input_series.id, due_start))
      else null
    end;
    -- A round-robin roster is submitted immediately after a new series. The
    -- roster RPC recalculates this unlocked row once its members are stored.
    assignment_source := case input_series.assignment_mode
      when 'fixed' then 'fixed'::public.task_assignment_source
      when 'round_robin' then case when assignee_id is null then 'unassigned'::public.task_assignment_source else 'round_robin'::public.task_assignment_source end
      else 'unassigned'::public.task_assignment_source
    end;

    insert into public.task_occurrences (
      series_id, household_id, occurrence_key, original_due_start, original_due_end,
      is_all_day, assignee_user_id, assignment_source
    ) values (
      input_series.id, input_series.household_id, generated_key, due_start, due_end,
      slot.is_all_day, assignee_id, assignment_source
    ) on conflict (series_id, occurrence_key) do nothing;
    if found then created_count := created_count + 1; end if;
  end loop;
  return created_count;
end;
$$;

create or replace function public.save_task_series(input jsonb)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_series;
  target_id uuid := nullif(input->>'id', '')::uuid;
  household uuid := (input->>'householdId')::uuid;
  slots jsonb := coalesce(input->'slots', '[]'::jsonb);
  slot jsonb;
  position integer := 0;
  recurrence_kind public.task_recurrence_type := (input->>'recurrenceType')::public.task_recurrence_type;
  series_kind public.task_series_type := (input->>'seriesType')::public.task_series_type;
  local_today date;
begin
  if pg_catalog.jsonb_typeof(input) <> 'object' or pg_catalog.jsonb_typeof(slots) <> 'array' then
    raise exception using errcode = '22023', message = 'task series input and slots must be objects and arrays';
  end if;
  if actor_id is null or not private.is_active_full_member(household, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if not public.validate_recurrence_config(input->'recurrenceConfig', recurrence_kind, series_kind) then
    raise exception using errcode = '22023', message = 'recurrence configuration is invalid';
  end if;
  if pg_catalog.jsonb_array_length(slots) < 1 or pg_catalog.jsonb_array_length(slots) > 12 then
    raise exception using errcode = '22023', message = 'between one and twelve schedule slots are required';
  end if;
  if target_id is null then
    insert into public.task_series (
      household_id, title, description, category_id, series_type, recurrence_type, recurrence_config,
      assignment_mode, fixed_assignee_id, missed_policy, confirmation_required, end_type, end_at,
      end_after_occurrences, effective_from, created_by
    ) values (
      household, pg_catalog.btrim(input->>'title'), nullif(pg_catalog.btrim(input->>'description'), ''), nullif(input->>'categoryId', '')::uuid,
      series_kind, recurrence_kind, input->'recurrenceConfig', coalesce((input->>'assignmentMode')::public.task_assignment_mode, 'unassigned'),
      nullif(input->>'fixedAssigneeId', '')::uuid, coalesce((input->>'missedPolicy')::public.task_missed_policy, 'keep_overdue'),
      coalesce((input->>'confirmationRequired')::boolean, false), coalesce((input->>'endType')::public.task_end_type, 'never'),
      nullif(input->>'endAt', '')::date, nullif(input->>'endAfterOccurrences', '')::integer, (input->>'effectiveFrom')::date, actor_id
    ) returning * into target;
  else
    select * into target from public.task_series where id = target_id for update;
    if target.id is null or target.household_id <> household then
      raise exception using errcode = '42501', message = 'the task series was not found in this household';
    end if;
    update public.task_series set
      title = pg_catalog.btrim(input->>'title'), description = nullif(pg_catalog.btrim(input->>'description'), ''), category_id = nullif(input->>'categoryId', '')::uuid,
      series_type = series_kind, recurrence_type = recurrence_kind, recurrence_config = input->'recurrenceConfig',
      assignment_mode = coalesce((input->>'assignmentMode')::public.task_assignment_mode, 'unassigned'), fixed_assignee_id = nullif(input->>'fixedAssigneeId', '')::uuid,
      missed_policy = coalesce((input->>'missedPolicy')::public.task_missed_policy, 'keep_overdue'), confirmation_required = coalesce((input->>'confirmationRequired')::boolean, false),
      end_type = coalesce((input->>'endType')::public.task_end_type, 'never'), end_at = nullif(input->>'endAt', '')::date,
      end_after_occurrences = nullif(input->>'endAfterOccurrences', '')::integer, effective_from = (input->>'effectiveFrom')::date
    where id = target.id returning * into target;
    delete from public.task_schedule_slots where series_id = target.id;
  end if;
  for slot in select value from pg_catalog.jsonb_array_elements(slots)
  loop
    insert into public.task_schedule_slots (series_id, local_start_time, local_end_time, end_day_offset, is_all_day, sort_order)
    values (target.id, nullif(slot->>'startTime', '')::time, nullif(slot->>'endTime', '')::time, coalesce((slot->>'endDayOffset')::smallint, 0), coalesce((slot->>'isAllDay')::boolean, false), position);
    position := position + 1;
  end loop;

  if target.recurrence_type = 'calendar' then
    select (pg_catalog.now() at time zone h.timezone)::date into local_today from public.households h where h.id = target.household_id;
    perform public.generate_calendar_occurrences(target.effective_from, greatest(target.effective_from, local_today + 90));
  else
    perform private.materialize_initial_occurrences(target);
  end if;
  return target;
end;
$$;

create or replace function public.replace_rotation_roster(input_series_id uuid, input_member_ids uuid[])
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
  if coalesce(pg_catalog.array_length(input_member_ids, 1), 0) < 1 or pg_catalog.array_length(input_member_ids, 1) > 50 or (select count(distinct value) from pg_catalog.unnest(input_member_ids) value) <> pg_catalog.array_length(input_member_ids, 1) then
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
    on conflict (series_id, user_id) do update set rotation_position = excluded.rotation_position, is_active = true;
    position := position + 1;
  end loop;
  if target.recurrence_type = 'calendar' then
    select (pg_catalog.now() at time zone h.timezone)::date into local_today from public.households h where h.id = target.household_id;
    perform public.generate_calendar_occurrences(target.effective_from, greatest(target.effective_from, local_today + 90));
  end if;
  return private.recalculate_rotation_assignments(target.id, actor_id, null, 'roster_changed');
end;
$$;

-- Repair pre-existing definitions that were saved before materialization was
-- part of the save contract. Calendar work stays bounded to the current horizon.
do $$
declare target public.task_series; local_today date;
begin
  for target in select * from public.task_series where series_status = 'active' and deleted_at is null
  loop
    if target.recurrence_type = 'calendar' then
      select (pg_catalog.now() at time zone h.timezone)::date into local_today from public.households h where h.id = target.household_id;
      perform public.generate_calendar_occurrences(target.effective_from, greatest(target.effective_from, local_today + 90));
    else
      perform private.materialize_initial_occurrences(target);
    end if;
  end loop;
end;
$$;

revoke all on function private.materialize_initial_occurrences(public.task_series) from public, anon, authenticated;
