begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the task creator');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.save_task_series('{
    "householdId":"00000000-0000-0000-0000-000000000201",
    "title":"Materialized one-time task",
    "seriesType":"one_time",
    "recurrenceType":"one_time",
    "recurrenceConfig":{"version":1},
    "effectiveFrom":"2026-08-02",
    "slots":[{"isAllDay":false,"startTime":"09:00","endTime":"09:15"}]
  }'::jsonb) $$,
  'saving a one-time task also creates its scheduled occurrence'
);
select is(
  (select count(*)::integer from public.task_occurrences o join public.task_series s on s.id = o.series_id where s.title = 'Materialized one-time task'),
  1,
  'one-time task is visible through the occurrence read model immediately'
);
select lives_ok(
  $$ select public.save_task_series('{
    "householdId":"00000000-0000-0000-0000-000000000201",
    "title":"Materialized calendar task",
    "seriesType":"recurring",
    "recurrenceType":"calendar",
    "recurrenceConfig":{"version":1,"frequency":"daily"},
    "effectiveFrom":"2026-08-02",
    "slots":[{"isAllDay":true}]
  }'::jsonb) $$,
  'saving a calendar task creates its bounded occurrence horizon'
);
select cmp_ok(
  (select count(*) from public.task_occurrences o join public.task_series s on s.id = o.series_id where s.title = 'Materialized calendar task'),
  '>', 0::bigint,
  'calendar task has at least one immediately readable occurrence'
);
reset role;

select * from finish();
rollback;
