begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select results_eq(
  'select count(*) from public.profiles',
  array[3::bigint],
  'seed contains the three canonical people'
);

select results_eq(
  'select count(*) from public.households',
  array[2::bigint],
  'seed contains two households'
);

select results_eq(
  $$select count(*) from public.household_memberships where role = 'full_member'$$,
  array[3::bigint],
  'seed contains three full-member memberships'
);

select results_eq(
  $$select count(*) from public.household_memberships where role = 'guest'$$,
  array[1::bigint],
  'seed contains one guest membership'
);

select is(
  (select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000701'),
  'open',
  'medicine fixture is open and overdue against its fixed due time'
);

select is(
  (select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000702'),
  'open',
  'dog-feeding fixture is open'
);

select ok(
  (select snoozed_until is not null from public.task_occurrences where id = '00000000-0000-0000-0000-000000000703'),
  'cleaning fixture is snoozed'
);

select is(
  (select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000704'),
  'completed',
  'bedtime fixture is completed'
);

select ok(
  (select assignee_user_id is null from public.task_occurrences where id = '00000000-0000-0000-0000-000000000705'),
  'recycling fixture is unassigned'
);

select results_eq(
  'select count(*) from public.task_events',
  array[4::bigint],
  'seed contains representative history events'
);

select * from finish();

rollback;
