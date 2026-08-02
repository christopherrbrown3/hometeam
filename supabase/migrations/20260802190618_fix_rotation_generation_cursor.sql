-- Carry the round-robin basis through one generation pass. A stable lookup of
-- the prior occurrence cannot see rows inserted earlier in the same statement,
-- which previously assigned every newly generated occurrence to the same
-- roster member.
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
  cursor_user_id uuid;
  cursor_initialized boolean;
  persisted_occurrence public.task_occurrences;
begin
  if input_from > input_through or input_through - input_from > 366 then
    raise exception using errcode = '22023', message = 'generation range must be ordered and at most 366 days';
  end if;
  for target in
    select * from public.task_series
    where recurrence_type = 'calendar' and series_status = 'active' and deleted_at is null
  loop
    cursor_user_id := null;
    cursor_initialized := false;
    for local_day in select generated_day::date from pg_catalog.generate_series(input_from, input_through, interval '1 day') as generated(generated_day)
    loop
      if not private.series_can_generate(target, local_day) then continue; end if;
      if target.recurrence_config->>'frequency' = 'weekly'
        and not exists (select 1 from pg_catalog.jsonb_array_elements_text(target.recurrence_config->'weekdays') day_number where day_number::integer = pg_catalog.date_part('dow', local_day)::integer)
      then continue; end if;
      if target.recurrence_config->>'frequency' = 'monthly'
        and pg_catalog.date_part('day', local_day)::integer <> least(
          (target.recurrence_config->>'dayOfMonth')::integer,
          pg_catalog.date_part('day', (pg_catalog.date_trunc('month', local_day)::date + interval '1 month - 1 day')::date)::integer
        )
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
        -- A paused/unavailable roster must not prevent the scheduler from
        -- generating unrelated series. The roster editor prevents new empty
        -- rosters; this guard safely skips legacy or temporarily ineligible rows.
        if target.assignment_mode = 'round_robin' and generated_assignee_id is null then continue; end if;
        generated_source := case target.assignment_mode
          when 'fixed' then 'fixed'::public.task_assignment_source
          when 'round_robin' then 'round_robin'::public.task_assignment_source
          else 'unassigned'::public.task_assignment_source
        end;
        persisted_occurrence := null;
        insert into public.task_occurrences (series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day, assignee_user_id, assignment_source)
        values (target.id, target.household_id, key_value, due_start, due_end, slot.is_all_day, generated_assignee_id, generated_source)
        on conflict (series_id, occurrence_key) do update
          set lifecycle_state = 'open', assignee_user_id = excluded.assignee_user_id,
              assignment_source = excluded.assignment_source, assignment_locked = false,
              skipped_by = null, skipped_at = null, skip_reason = null,
              snoozed_by = null, snoozed_until = null, version = public.task_occurrences.version + 1
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
          -- Existing rows are part of the persisted rotation history, even
          -- when this call is idempotently re-running generation.
          select * into persisted_occurrence
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
  end loop;
  return generated;
end;
$$;

revoke all on function public.generate_calendar_occurrences(date, date) from public, anon;

-- Recalculation starts at the latest persisted assignment before the first
-- future row. Without this basis, a recalculation performed after today's
-- occurrence is overdue starts from the first roster member and can rewrite
-- the next occurrence out of sequence.
create or replace function private.recalculate_rotation_assignments(
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

  cursor_user_id := coalesce(
    input_cursor_user_id,
    private.rotation_basis_before(target.id, pg_catalog.now())
  );
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
