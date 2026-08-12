begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public', 'list_history', array['uuid'], 'history is exposed through a scoped RPC');
select ok(not pg_catalog.has_table_privilege('authenticated', 'public.task_events', 'select'), 'browser roles cannot read the raw audit table');
select ok(pg_catalog.has_function_privilege('authenticated', 'public.list_history(uuid)', 'execute'), 'authenticated clients can execute only the history projection');

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000103';
update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000102';
update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000103', lifecycle_state = 'open', snoozed_by = null, snoozed_until = null, version = 1
where id = '00000000-0000-0000-0000-000000000701';

update public.platform_access set status = 'suspended' where user_id = '00000000-0000-0000-0000-000000000103';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select throws_ok(
  $$ select public.complete_occurrence('00000000-0000-0000-0000-000000000701', 1, false) $$,
  '42501', 'guest_action_forbidden', 'a suspended guest cannot mutate an assigned occurrence'
);
reset role;

update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000103';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select lives_ok(
  $$ select public.snooze_occurrence('00000000-0000-0000-0000-000000000701', 1, now() + interval '30 minutes') $$,
  'an approved assigned guest retains legitimate lifecycle access'
);
reset role;

insert into public.task_events (id, household_id, series_id, occurrence_id, actor_user_id, event_type, event_payload)
values (
  '00000000-0000-0000-0000-000000000810',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000101',
  'assigned',
  '{"reason":"private note","beforeAssigneeId":"00000000-0000-0000-0000-000000000102","rotationBasisUserId":"00000000-0000-0000-0000-000000000101"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select is(
  (select event_payload from public.list_history('00000000-0000-0000-0000-000000000201') where id = '00000000-0000-0000-0000-000000000810'),
  '{}'::jsonb,
  'guest history strips free-form reasons and assignment identifiers'
);
select is(
  (select actor_user_id from public.list_history('00000000-0000-0000-0000-000000000201') where id = '00000000-0000-0000-0000-000000000810'),
  null::uuid,
  'guest history omits actor identifiers'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(
  (select event_payload from public.list_history('00000000-0000-0000-0000-000000000201') where id = '00000000-0000-0000-0000-000000000810'),
  '{"reason":"private note","beforeAssigneeId":"00000000-0000-0000-0000-000000000102","rotationBasisUserId":"00000000-0000-0000-0000-000000000101"}'::jsonb,
  'full members retain the existing raw history behavior'
);
select is(
  (select actor_user_id from public.list_history('00000000-0000-0000-0000-000000000201') where id = '00000000-0000-0000-0000-000000000810'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'full members retain actor attribution'
);
select throws_ok(
  $$ select public.replace_rotation_roster(
    '00000000-0000-0000-0000-000000000406',
    ARRAY[
      ARRAY['00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid],
      ARRAY['00000000-0000-0000-0000-000000000102'::uuid, '00000000-0000-0000-0000-000000000101'::uuid]
    ]
  ) $$,
  '22023', 'the rotation roster must contain one to fifty unique members',
  'multidimensional rosters cannot bypass the member limit'
);
select lives_ok(
  $$ select public.replace_rotation_roster('00000000-0000-0000-0000-000000000406', array['00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid]) $$,
  'a valid one-dimensional roster remains supported'
);
reset role;

select * from finish();
rollback;
