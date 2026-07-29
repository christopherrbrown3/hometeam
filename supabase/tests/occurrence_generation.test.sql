begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_function('public', 'validate_recurrence_config', array['jsonb', 'task_recurrence_type', 'task_series_type'], 'recurrence validation function exists');
select has_function('public', 'generate_calendar_occurrences', array['date', 'date'], 'calendar generator exists');
select has_function('public', 'apply_missed_policies', array['timestamp with time zone'], 'missed policy function exists');
select has_function('public', 'save_task_series', array['jsonb'], 'authorized task-series save function exists');

select ok(
  public.validate_recurrence_config('{"version":1,"frequency":"weekly","weekdays":[1,3,5]}'::jsonb, 'calendar', 'recurring'),
  'weekly recurrence contract accepts selected weekdays'
);

select ok(
  not public.validate_recurrence_config('{"version":1,"frequency":"weekly"}'::jsonb, 'calendar', 'recurring'),
  'weekly recurrence contract rejects an empty weekday set'
);

select ok(
  public.validate_recurrence_config('{"version":1,"frequency":"monthly","dayOfMonth":31}'::jsonb, 'calendar', 'recurring'),
  'monthly recurrence accepts a valid day of the month'
);

select throws_ok(
  $$
    insert into public.task_schedule_slots (series_id, local_start_time, local_end_time, sort_order)
    values ('00000000-0000-0000-0000-000000000401', '18:00', '08:00', 99)
  $$,
  '23514',
  'new row for relation "task_schedule_slots" violates check constraint "task_schedule_slots_end_not_before_start"',
  'a same-day schedule end cannot precede its start'
);

select throws_ok(
  $$
    insert into public.task_series (household_id, title, series_type, recurrence_type, recurrence_config, end_type, end_at, effective_from, created_by)
    values ('00000000-0000-0000-0000-000000000201', 'Bad end condition', 'one_time', 'one_time', '{"version":1}', 'never', '2026-12-01', '2026-01-01', '00000000-0000-0000-0000-000000000101')
  $$,
  '23514',
  'new row for relation "task_series" violates check constraint "task_series_end_condition_matches_type"',
  'end-condition fields must match their selected end type'
);

select lives_ok($$ select public.generate_calendar_occurrences('2026-03-02', '2026-03-08') $$, 'calendar generator creates a bounded weekly horizon');

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000401' and occurrence_key like '2026-03-%'),
  3,
  'one slot is generated for each selected weekday'
);

select is(public.generate_calendar_occurrences('2026-03-02', '2026-03-08'), 0, 'rerunning the same generation range is idempotent');

select is(
  public.next_interval_successor('00000000-0000-0000-0000-000000000408', '2026-01-01T00:00:00Z'),
  '2026-04-01T00:00:00Z'::timestamptz,
  'completion interval successor is anchored to the terminal action timestamp'
);

select throws_ok($$ select public.pause_task_series('00000000-0000-0000-0000-000000000401') $$, '42501', 'active full membership is required', 'anonymous callers cannot pause a series');
select throws_ok(
  $$ select public.save_task_series('{"householdId":"00000000-0000-0000-0000-000000000201","title":"Unauthorized","seriesType":"one_time","recurrenceType":"one_time","recurrenceConfig":{"version":1},"effectiveFrom":"2026-03-01","slots":[{"isAllDay":true}]}'::jsonb) $$,
  '42501', 'active full membership is required', 'anonymous callers cannot create a task series'
);

select * from finish();

rollback;
