begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select ok(
  public.validate_recurrence_config('{"version":1,"frequency":"monthly","dayOfMonth":31}'::jsonb, 'calendar', 'recurring'),
  'monthly recurrence accepts a day of the month'
);

insert into public.task_series (id, household_id, title, series_type, recurrence_type, recurrence_config, effective_from, created_by)
values ('00000000-0000-0000-0000-000000000499', '00000000-0000-0000-0000-000000000201', 'Month end cleanup', 'recurring', 'calendar', '{"version":1,"frequency":"monthly","dayOfMonth":31}', '2026-01-31', '00000000-0000-0000-0000-000000000101');
insert into public.task_schedule_slots (series_id, is_all_day, sort_order)
values ('00000000-0000-0000-0000-000000000499', true, 0);
select lives_ok($$ select public.generate_calendar_occurrences('2026-02-01', '2026-04-30') $$, 'monthly generation succeeds');
select is(
  (select string_agg(split_part(occurrence_key, '|', 1), ',' order by occurrence_key) from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000499'),
  '2026-02-28,2026-03-31,2026-04-30',
  'monthly generation uses the last day of shorter months'
);

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.save_task_series('{"householdId":"00000000-0000-0000-0000-000000000201","title":"Bring in bins test","seriesType":"one_time","recurrenceType":"one_time","recurrenceConfig":{"version":1},"effectiveFrom":"2026-08-20","assignmentMode":"fixed","fixedAssigneeId":"00000000-0000-0000-0000-000000000101","slots":[{"isAllDay":true}]}'::jsonb) $$,
  'an initial one-time task is saved'
);
select is(
  (select count(*)::integer from public.task_occurrences o join public.task_series s on s.id = o.series_id where s.title = 'Bring in bins test' and o.lifecycle_state = 'open'),
  1,
  'the newly saved task has one visible occurrence'
);
select lives_ok(
  $$ select public.save_task_series(jsonb_build_object('id', (select id from public.task_series where title = 'Bring in bins test'), 'householdId', '00000000-0000-0000-0000-000000000201', 'title', 'Bring in bins test', 'seriesType', 'one_time', 'recurrenceType', 'one_time', 'recurrenceConfig', jsonb_build_object('version', 1), 'effectiveFrom', '2026-08-21', 'assignmentMode', 'fixed', 'fixedAssigneeId', '00000000-0000-0000-0000-000000000102', 'slots', jsonb_build_array(jsonb_build_object('isAllDay', true)))); $$,
  'editing a task reschedules its future occurrence'
);
select is(
  (select occurrence_key from public.task_occurrences o join public.task_series s on s.id = o.series_id where s.title = 'Bring in bins test' and o.lifecycle_state = 'open'),
  '2026-08-21|all-day|0|0',
  'the edited due date is the only open occurrence'
);
select is(
  (select assignee_user_id::text from public.task_occurrences o join public.task_series s on s.id = o.series_id where s.title = 'Bring in bins test' and o.lifecycle_state = 'open'),
  '00000000-0000-0000-0000-000000000102',
  'the edited owner applies to the open occurrence'
);

reset role;
insert into public.task_series (id, household_id, title, series_type, recurrence_type, recurrence_config, effective_from, created_by)
values ('00000000-0000-0000-0000-000000000498', '00000000-0000-0000-0000-000000000201', 'Pause test', 'recurring', 'calendar', '{"version":1,"frequency":"daily"}', current_date, '00000000-0000-0000-0000-000000000101');
insert into public.task_schedule_slots (series_id, is_all_day, sort_order)
values ('00000000-0000-0000-0000-000000000498', true, 0);
insert into public.task_occurrences (id, series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day)
values
  ('00000000-0000-0000-0000-000000000798', '00000000-0000-0000-0000-000000000498', '00000000-0000-0000-0000-000000000201', 'pause-overdue', now() - interval '2 hours', now() - interval '1 hour', false),
  ('00000000-0000-0000-0000-000000000797', '00000000-0000-0000-0000-000000000498', '00000000-0000-0000-0000-000000000201', 'pause-future', now() + interval '1 day', now() + interval '1 day 1 hour', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok($$ select public.pause_task_series('00000000-0000-0000-0000-000000000498') $$, 'a full member can pause an overdue series');
select is((select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000798'), 'skipped', 'pausing moves overdue work to history');
select is((select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000797'), 'cancelled', 'pausing removes future work from active views');
select lives_ok($$ select public.resume_task_series('00000000-0000-0000-0000-000000000498') $$, 'a paused series can resume');
select ok(exists (select 1 from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000498' and lifecycle_state = 'open' and original_due_start > now()), 'resuming restores future calendar work');

reset role;
select * from finish();
rollback;
