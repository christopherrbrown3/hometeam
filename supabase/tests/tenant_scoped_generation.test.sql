begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted setup approves the household member'
);

insert into public.task_series (
  id,
  household_id,
  title,
  series_type,
  recurrence_type,
  recurrence_config,
  assignment_mode,
  effective_from,
  created_by
)
values (
  '00000000-0000-0000-0000-000000000492',
  '00000000-0000-0000-0000-000000000202',
  'Unrelated household calendar series',
  'recurring',
  'calendar',
  '{"version":1,"frequency":"daily"}',
  'unassigned',
  current_date + 400,
  '00000000-0000-0000-0000-000000000103'
);

insert into public.task_schedule_slots (series_id, is_all_day, sort_order)
values ('00000000-0000-0000-0000-000000000492', true, 0);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select lives_ok(
  format(
    $save$
      select public.save_task_series(
        jsonb_build_object(
          'householdId', '00000000-0000-0000-0000-000000000201',
          'title', 'Tenant-scoped save test',
          'seriesType', 'recurring',
          'recurrenceType', 'calendar',
          'recurrenceConfig', jsonb_build_object('version', 1, 'frequency', 'daily'),
          'effectiveFrom', %L,
          'slots', jsonb_build_array(jsonb_build_object('isAllDay', true))
        )
      )
    $save$,
    (current_date + 400)::text
  ),
  'saving a calendar series succeeds'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000492'),
  0,
  'saving in one household does not generate occurrences for another household'
);

select is(
  (
    select count(*)::integer
    from public.task_occurrences o
    join public.task_series s on s.id = o.series_id
    where s.title = 'Tenant-scoped save test'
  ),
  1,
  'saving still materializes the authorized series'
);

reset role;

insert into public.task_series (
  id,
  household_id,
  title,
  series_type,
  recurrence_type,
  recurrence_config,
  assignment_mode,
  series_status,
  effective_from,
  created_by
)
values (
  '00000000-0000-0000-0000-000000000490',
  '00000000-0000-0000-0000-000000000201',
  'Tenant-scoped resume test',
  'recurring',
  'calendar',
  '{"version":1,"frequency":"daily"}',
  'unassigned',
  'paused',
  current_date + 400,
  '00000000-0000-0000-0000-000000000101'
);

insert into public.task_schedule_slots (series_id, is_all_day, sort_order)
values ('00000000-0000-0000-0000-000000000490', true, 0);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select lives_ok(
  $$ select public.resume_task_series('00000000-0000-0000-0000-000000000490') $$,
  'resuming an authorized calendar series succeeds'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000492'),
  0,
  'resuming in one household does not generate occurrences for another household'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000490'),
  1,
  'resuming still materializes the authorized series'
);

reset role;

insert into public.task_series (
  id,
  household_id,
  title,
  series_type,
  recurrence_type,
  recurrence_config,
  assignment_mode,
  effective_from,
  created_by
)
values (
  '00000000-0000-0000-0000-000000000491',
  '00000000-0000-0000-0000-000000000201',
  'Tenant-scoped roster test',
  'recurring',
  'calendar',
  '{"version":1,"frequency":"daily"}',
  'round_robin',
  current_date + 400,
  '00000000-0000-0000-0000-000000000101'
);

insert into public.task_schedule_slots (series_id, is_all_day, sort_order)
values ('00000000-0000-0000-0000-000000000491', true, 0);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select lives_ok(
  $$
    select public.replace_rotation_roster(
      '00000000-0000-0000-0000-000000000491',
      array['00000000-0000-0000-0000-000000000101'::uuid]
    )
  $$,
  'replacing an authorized rotation roster succeeds'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000492'),
  0,
  'roster replacement in one household does not generate occurrences for another household'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000491'),
  1,
  'roster replacement still materializes the authorized series'
);

reset role;

select lives_ok(
  format(
    'select public.generate_calendar_occurrences(%L, %L)',
    (current_date + 400)::text,
    (current_date + 400)::text
  ),
  'the trusted all-series scheduler entry point still succeeds'
);

select is(
  (select count(*)::integer from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000492'),
  1,
  'the trusted scheduler still generates the unrelated household series'
);

select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.generate_calendar_occurrences_for_series(uuid,date,date)',
    'execute'
  ),
  'browser roles cannot execute the private series generator directly'
);

select * from finish();

rollback;
