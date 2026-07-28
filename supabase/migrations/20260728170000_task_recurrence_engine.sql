-- Milestone 4: recurrence is stored as a small, versioned JSON contract while
-- all authority (membership, generation, pause/resume) stays in PostgreSQL.

create function public.validate_recurrence_config(
  input_config jsonb,
  input_recurrence_type public.task_recurrence_type,
  input_series_type public.task_series_type
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  weekday jsonb;
begin
  if pg_catalog.jsonb_typeof(input_config) <> 'object' or input_config->>'version' <> '1' then
    return false;
  end if;
  if input_series_type = 'one_time' then
    return input_recurrence_type = 'one_time' and input_config = '{"version":1}'::jsonb;
  end if;
  if input_recurrence_type = 'calendar' then
    if input_config->>'frequency' not in ('daily', 'weekly') then return false; end if;
    if input_config->>'frequency' = 'daily' then return input_config - array['version', 'frequency'] = '{}'::jsonb; end if;
    weekday := input_config->'weekdays';
    return coalesce(pg_catalog.jsonb_typeof(weekday) = 'array'
      and pg_catalog.jsonb_array_length(weekday) between 1 and 7
      and not exists (
        select 1 from pg_catalog.jsonb_array_elements(weekday) item
        where pg_catalog.jsonb_typeof(item) <> 'number'
          or (item #>> '{}')::integer not between 0 and 6
      ), false) and input_config - array['version', 'frequency', 'weekdays'] = '{}'::jsonb;
  end if;
  if input_recurrence_type = 'completion_interval' then
    return input_config - array['version', 'intervalMinutes'] = '{}'::jsonb
      and input_config ? 'intervalMinutes'
      and pg_catalog.jsonb_typeof(input_config->'intervalMinutes') = 'number'
      and (input_config->>'intervalMinutes')::integer between 1 and 1051200;
  end if;
  return false;
end;
$$;

alter table public.task_series
  add constraint task_series_recurrence_contract_valid
  check (public.validate_recurrence_config(recurrence_config, recurrence_type, series_type));

alter table public.task_series
  add constraint task_series_end_condition_matches_type
  check (
    (end_type = 'never' and end_at is null and end_after_occurrences is null)
    or (end_type = 'on_date' and end_at is not null and end_after_occurrences is null)
    or (end_type = 'after_occurrences' and end_at is null and end_after_occurrences is not null)
  );

alter table public.task_schedule_slots
  add constraint task_schedule_slots_end_not_before_start
  check (is_all_day or end_day_offset = 1 or local_end_time is null or local_end_time >= local_start_time);

-- Keep the deterministic occurrence uniqueness contract explicit for planner
-- and migration readers, even though the original unique constraint enforces it.
create unique index if not exists task_occurrences_series_occurrence_key_unique
  on public.task_occurrences (series_id, occurrence_key);

create function private.series_can_generate(
  input_series public.task_series,
  input_local_date date
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select input_series.series_status = 'active'
    and input_series.deleted_at is null
    and input_local_date >= input_series.effective_from
    and (input_series.end_type <> 'on_date' or input_series.end_at is null or input_local_date <= input_series.end_at)
    and (
      input_series.end_type <> 'after_occurrences'
      or input_series.end_after_occurrences is null
      or (select count(*) from public.task_occurrences o where o.series_id = input_series.id) < input_series.end_after_occurrences
    );
$$;

create function public.next_interval_successor(
  input_series_id uuid,
  input_anchor timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target public.task_series;
  minutes integer;
begin
  select * into target from public.task_series where id = input_series_id;
  if target.id is null or target.recurrence_type <> 'completion_interval' then
    raise exception using errcode = '22023', message = 'a completion-interval series is required';
  end if;
  minutes := (target.recurrence_config->>'intervalMinutes')::integer;
  return input_anchor + pg_catalog.make_interval(mins => minutes);
end;
$$;

create function public.generate_calendar_occurrences(
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
        insert into public.task_occurrences (series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day, assignee_user_id, assignment_source)
        values (target.id, target.household_id, key_value, due_start, due_end, slot.is_all_day, target.fixed_assignee_id, (case when target.assignment_mode = 'fixed' then 'fixed' else 'unassigned' end)::public.task_assignment_source)
        on conflict (series_id, occurrence_key) do nothing;
        if found then generated := generated + 1; end if;
      end loop;
    end loop;
  end loop;
  return generated;
end;
$$;

create function public.apply_missed_policies(input_now timestamptz default pg_catalog.now())
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare affected integer := 0;
begin
  with candidates as (
    select o.id
    from public.task_occurrences o
    join public.task_series s on s.id = o.series_id
    where o.lifecycle_state = 'open' and o.original_due_end < input_now
      and (
        (s.missed_policy = 'skip_when_next_occurrence_begins' and exists (select 1 from public.task_occurrences newer where newer.series_id = o.series_id and newer.lifecycle_state = 'open' and newer.original_due_start > o.original_due_start and newer.original_due_start <= input_now))
        or (s.missed_policy = 'keep_newest' and exists (select 1 from public.task_occurrences newer where newer.series_id = o.series_id and newer.lifecycle_state = 'open' and newer.original_due_start > o.original_due_start))
      )
  )
  update public.task_occurrences o set lifecycle_state = 'skipped', skipped_at = input_now, skip_reason = 'missed_policy', version = version + 1
  from candidates c where c.id = o.id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create function public.pause_task_series(input_series_id uuid)
returns public.task_series
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
  update public.task_series set series_status = 'paused' where id = target.id returning * into target;
  return target;
end;
$$;

create function public.resume_task_series(input_series_id uuid)
returns public.task_series
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
  update public.task_series set series_status = 'active' where id = target.id returning * into target;
  return target;
end;
$$;

revoke all on function public.validate_recurrence_config(jsonb, public.task_recurrence_type, public.task_series_type), private.series_can_generate(public.task_series, date), public.next_interval_successor(uuid, timestamptz), public.generate_calendar_occurrences(date, date), public.apply_missed_policies(timestamptz), public.pause_task_series(uuid), public.resume_task_series(uuid) from public, anon;
grant execute on function public.pause_task_series(uuid), public.resume_task_series(uuid) to authenticated;
