create function public.save_task_series(input jsonb)
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
    values (
      target.id, nullif(slot->>'startTime', '')::time, nullif(slot->>'endTime', '')::time,
      coalesce((slot->>'endDayOffset')::smallint, 0), coalesce((slot->>'isAllDay')::boolean, false), position
    );
    position := position + 1;
  end loop;
  return target;
end;
$$;

revoke all on function public.save_task_series(jsonb) from public, anon;
grant execute on function public.save_task_series(jsonb) to authenticated;
