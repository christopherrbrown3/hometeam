-- Keep browser-triggered materialization inside the series that was already
-- authorized by its owning RPC. The public two-date generator remains the
-- scheduler-only all-series entry point.

create function private.generate_calendar_occurrences_for_series(
  input_series_id uuid,
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
  cursor_user_id uuid;
  cursor_initialized boolean := false;
  persisted_occurrence public.task_occurrences;
begin
  if input_from > input_through or input_through - input_from > 366 then
    raise exception using errcode = '22023', message = 'generation range must be ordered and at most 366 days';
  end if;

  select *
  into target
  from public.task_series
  where id = input_series_id
    and recurrence_type = 'calendar'
    and series_status = 'active'
    and deleted_at is null;

  if target.id is null then
    return 0;
  end if;

  cursor_user_id := null;
  for local_day in
    select generated_day::date
    from pg_catalog.generate_series(input_from, input_through, interval '1 day') as generated(generated_day)
  loop
    if not private.series_can_generate(target, local_day) then continue; end if;
    if target.recurrence_config->>'frequency' = 'weekly'
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements_text(target.recurrence_config->'weekdays') day_number
        where day_number::integer = pg_catalog.date_part('dow', local_day)::integer
      )
    then continue; end if;
    if target.recurrence_config->>'frequency' = 'monthly'
      and pg_catalog.date_part('day', local_day)::integer <> least(
        (target.recurrence_config->>'dayOfMonth')::integer,
        pg_catalog.date_part(
          'day',
          (pg_catalog.date_trunc('month', local_day)::date + interval '1 month - 1 day')::date
        )::integer
      )
    then continue; end if;

    for slot in
      select * from public.task_schedule_slots where series_id = target.id order by sort_order
    loop
      key_value := pg_catalog.to_char(local_day, 'YYYY-MM-DD') || '|' ||
        case
          when slot.is_all_day then 'all-day'
          else pg_catalog.to_char(slot.local_start_time, 'HH24:MI') || '-' ||
            pg_catalog.to_char(coalesce(slot.local_end_time, slot.local_start_time), 'HH24:MI')
        end || '|' || slot.end_day_offset || '|' || slot.sort_order;

      if slot.is_all_day then
        due_start := local_day::timestamp at time zone (
          select timezone from public.households where id = target.household_id
        );
        due_end := (local_day + 1)::timestamp at time zone (
          select timezone from public.households where id = target.household_id
        );
      else
        due_start := (local_day + slot.local_start_time) at time zone (
          select timezone from public.households where id = target.household_id
        );
        due_end := (
          local_day + slot.end_day_offset + coalesce(slot.local_end_time, slot.local_start_time)
        ) at time zone (
          select timezone from public.households where id = target.household_id
        );
      end if;

      if target.assignment_mode = 'round_robin' then
        if not cursor_initialized then
          cursor_user_id := private.rotation_basis_before(target.id, due_start);
          cursor_initialized := true;
        end if;
        generated_assignee_id := private.next_rotation_assignee(target.id, cursor_user_id);
      else
        generated_assignee_id := case target.assignment_mode
          when 'fixed' then target.fixed_assignee_id
          else null
        end;
      end if;

      if target.assignment_mode = 'round_robin' and generated_assignee_id is null then
        continue;
      end if;

      generated_source := case target.assignment_mode
        when 'fixed' then 'fixed'::public.task_assignment_source
        when 'round_robin' then 'round_robin'::public.task_assignment_source
        else 'unassigned'::public.task_assignment_source
      end;

      persisted_occurrence := null;
      insert into public.task_occurrences (
        series_id,
        household_id,
        occurrence_key,
        original_due_start,
        original_due_end,
        is_all_day,
        assignee_user_id,
        assignment_source
      )
      values (
        target.id,
        target.household_id,
        key_value,
        due_start,
        due_end,
        slot.is_all_day,
        generated_assignee_id,
        generated_source
      )
      on conflict (series_id, occurrence_key) do update
        set lifecycle_state = 'open',
            assignee_user_id = excluded.assignee_user_id,
            assignment_source = excluded.assignment_source,
            assignment_locked = false,
            skipped_by = null,
            skipped_at = null,
            skip_reason = null,
            snoozed_by = null,
            snoozed_until = null,
            version = public.task_occurrences.version + 1
        where public.task_occurrences.lifecycle_state = 'cancelled'
          and public.task_occurrences.skip_reason in ('series_rescheduled', 'series_paused')
          and public.task_occurrences.original_due_start >= pg_catalog.now()
      returning * into persisted_occurrence;

      if found then
        generated := generated + 1;
        if target.assignment_mode = 'round_robin' then
          cursor_user_id := persisted_occurrence.assignee_user_id;
        end if;
      elsif target.assignment_mode = 'round_robin' then
        select *
        into persisted_occurrence
        from public.task_occurrences
        where series_id = target.id and occurrence_key = key_value;

        if persisted_occurrence.id is not null
          and persisted_occurrence.lifecycle_state <> 'deleted'
          and private.is_active_rotation_member(target.id, persisted_occurrence.assignee_user_id)
        then
          cursor_user_id := persisted_occurrence.assignee_user_id;
        end if;
      end if;
    end loop;
  end loop;

  return generated;
end;
$$;

revoke all on function private.generate_calendar_occurrences_for_series(uuid, date, date)
from public, anon, authenticated;

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
  target_id uuid;
  generated integer := 0;
begin
  if input_from > input_through or input_through - input_from > 366 then
    raise exception using errcode = '22023', message = 'generation range must be ordered and at most 366 days';
  end if;

  for target_id in
    select id
    from public.task_series
    where recurrence_type = 'calendar'
      and series_status = 'active'
      and deleted_at is null
  loop
    generated := generated + private.generate_calendar_occurrences_for_series(
      target_id,
      input_from,
      input_through
    );
  end loop;

  return generated;
end;
$$;

revoke all on function public.generate_calendar_occurrences(date, date) from public, anon;

create or replace function public.save_task_series(input jsonb)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_series;
  prior public.task_series;
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
      household, pg_catalog.btrim(input->>'title'), nullif(pg_catalog.btrim(input->>'description'), ''),
      nullif(input->>'categoryId', '')::uuid, series_kind, recurrence_kind, input->'recurrenceConfig',
      coalesce((input->>'assignmentMode')::public.task_assignment_mode, 'unassigned'),
      nullif(input->>'fixedAssigneeId', '')::uuid,
      coalesce((input->>'missedPolicy')::public.task_missed_policy, 'keep_overdue'),
      coalesce((input->>'confirmationRequired')::boolean, false),
      coalesce((input->>'endType')::public.task_end_type, 'never'),
      nullif(input->>'endAt', '')::date,
      nullif(input->>'endAfterOccurrences', '')::integer,
      (input->>'effectiveFrom')::date,
      actor_id
    ) returning * into target;
  else
    select * into prior from public.task_series where id = target_id for update;
    if prior.id is null or prior.household_id <> household then
      raise exception using errcode = '42501', message = 'the task series was not found in this household';
    end if;
    if prior.series_status = 'deleted' then
      raise exception using errcode = '22023', message = 'deleted tasks cannot be edited';
    end if;
    update public.task_series set
      title = pg_catalog.btrim(input->>'title'),
      description = nullif(pg_catalog.btrim(input->>'description'), ''),
      category_id = nullif(input->>'categoryId', '')::uuid,
      series_type = series_kind,
      recurrence_type = recurrence_kind,
      recurrence_config = input->'recurrenceConfig',
      assignment_mode = coalesce((input->>'assignmentMode')::public.task_assignment_mode, 'unassigned'),
      fixed_assignee_id = nullif(input->>'fixedAssigneeId', '')::uuid,
      missed_policy = coalesce((input->>'missedPolicy')::public.task_missed_policy, 'keep_overdue'),
      confirmation_required = coalesce((input->>'confirmationRequired')::boolean, false),
      end_type = coalesce((input->>'endType')::public.task_end_type, 'never'),
      end_at = nullif(input->>'endAt', '')::date,
      end_after_occurrences = nullif(input->>'endAfterOccurrences', '')::integer,
      effective_from = (input->>'effectiveFrom')::date
    where id = prior.id
    returning * into target;
    delete from public.task_schedule_slots where series_id = target.id;
  end if;

  for slot in select value from pg_catalog.jsonb_array_elements(slots)
  loop
    insert into public.task_schedule_slots (
      series_id, local_start_time, local_end_time, end_day_offset, is_all_day, sort_order
    ) values (
      target.id,
      nullif(slot->>'startTime', '')::time,
      nullif(slot->>'endTime', '')::time,
      coalesce((slot->>'endDayOffset')::smallint, 0),
      coalesce((slot->>'isAllDay')::boolean, false),
      position
    );
    position := position + 1;
  end loop;

  select (pg_catalog.now() at time zone h.timezone)::date
  into local_today
  from public.households h
  where h.id = target.household_id;

  if target_id is not null then
    update public.task_occurrences
    set lifecycle_state = 'cancelled',
        skip_reason = 'series_rescheduled',
        snoozed_by = null,
        snoozed_until = null,
        version = version + 1
    where series_id = target.id
      and lifecycle_state = 'open'
      and original_due_start >= pg_catalog.now();
    perform private.write_series_event(
      target,
      actor_id,
      'series_updated',
      pg_catalog.jsonb_build_object(
        'scope', 'future_schedule',
        'rescheduledOpenOccurrences', (
          select count(*)
          from public.task_occurrences
          where series_id = target.id
            and lifecycle_state = 'cancelled'
            and skip_reason = 'series_rescheduled'
        )
      )
    );
  end if;

  if target.recurrence_type = 'calendar' then
    perform private.generate_calendar_occurrences_for_series(
      target.id,
      greatest(target.effective_from, local_today),
      greatest(target.effective_from, local_today + 90)
    );
  else
    perform private.materialize_initial_occurrences(target);
  end if;
  return target;
end;
$$;

create or replace function public.resume_task_series(input_series_id uuid)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_series;
  local_today date;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then
    raise exception using errcode = '42501', message = 'active full membership is required';
  end if;
  if target.series_status <> 'paused' then
    raise exception using errcode = '22023', message = 'only paused series can be resumed';
  end if;

  update public.task_series set series_status = 'active' where id = target.id returning * into target;
  if target.recurrence_type = 'calendar' then
    select (pg_catalog.now() at time zone h.timezone)::date
    into local_today
    from public.households h
    where h.id = target.household_id;
    perform private.generate_calendar_occurrences_for_series(
      target.id,
      greatest(target.effective_from, local_today),
      greatest(target.effective_from, local_today + 90)
    );
  else
    perform private.materialize_initial_occurrences(target);
  end if;
  perform private.write_series_event(
    target,
    actor_id,
    'series_resumed',
    pg_catalog.jsonb_build_object('previousStatus', 'paused')
  );
  return target;
end;
$$;

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
  if coalesce(pg_catalog.array_length(input_member_ids, 1), 0) < 1
    or pg_catalog.array_length(input_member_ids, 1) > 50
    or (
      select count(distinct value)
      from pg_catalog.unnest(input_member_ids) value
    ) <> pg_catalog.array_length(input_member_ids, 1)
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
