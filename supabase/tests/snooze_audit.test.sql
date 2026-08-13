begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function('public', 'snooze_occurrence', array['uuid', 'bigint', 'timestamptz'], 'snooze RPC is present');
select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');

update public.task_occurrences
set lifecycle_state = 'open', snoozed_by = null, snoozed_until = '2099-01-01T00:00:00Z', version = 1
where id = '00000000-0000-0000-0000-000000000703';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.snooze_occurrence('00000000-0000-0000-0000-000000000703', 1, '2099-01-02T00:00:00Z') $$,
  'an active full member can change an existing snooze'
);
select is(
  (select event_payload
   from public.list_history('00000000-0000-0000-0000-000000000201')
   where occurrence_id = '00000000-0000-0000-0000-000000000703'
     and event_type = 'snooze_changed'
   order by created_at desc
   limit 1),
  '{"version":1,"previousSnoozedUntil":"2099-01-01T00:00:00+00:00","snoozedUntil":"2099-01-02T00:00:00+00:00"}'::jsonb,
  'snooze changes record both the previous and new expiration values'
);
select is(
  (select snoozed_until from public.task_occurrences where id = '00000000-0000-0000-0000-000000000703'),
  '2099-01-02T00:00:00Z'::timestamptz,
  'the occurrence retains the requested new expiration'
);

reset role;
update public.task_occurrences
set lifecycle_state = 'open', snoozed_by = null, snoozed_until = null, version = 1
where id = '00000000-0000-0000-0000-000000000701';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.snooze_occurrence('00000000-0000-0000-0000-000000000701', 1, '2099-01-03T00:00:00Z') $$,
  'an active full member can create a first snooze'
);
select is(
  (select event_payload
   from public.list_history('00000000-0000-0000-0000-000000000201')
   where occurrence_id = '00000000-0000-0000-0000-000000000701'
     and event_type = 'snoozed'
   order by created_at desc
   limit 1),
  '{"version":1,"previousSnoozedUntil":null,"snoozedUntil":"2099-01-03T00:00:00+00:00"}'::jsonb,
  'a first snooze records a null previous expiration'
);
reset role;

select * from finish();
rollback;
