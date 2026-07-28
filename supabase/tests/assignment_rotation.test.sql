begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public', 'claim_occurrence', array['uuid', 'bigint'], 'claim RPC is present');
select has_function('public', 'assign_occurrence', array['uuid', 'uuid', 'bigint', 'boolean'], 'assign RPC is present');
select has_function('public', 'replace_rotation_roster', array['uuid', 'uuid[]'], 'roster RPC is present');
select has_function('public', 'recalculate_future_assignments', array['uuid', 'uuid'], 'recalculation RPC is present');

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
update public.platform_access
set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000103');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select lives_ok($$ select public.claim_occurrence('00000000-0000-0000-0000-000000000705', 1) $$, 'a full member can claim an open unassigned occurrence');
select is(
  (select assignment_source::text || ':' || assignee_user_id::text || ':' || version::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000705'),
  'claimed:00000000-0000-0000-0000-000000000101:2',
  'claim sets the actor, source, and exactly one new version'
);
select throws_ok(
  $$ select public.assign_occurrence('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000102', 1, false) $$,
  '40001', 'stale occurrence version', 'stale assignment contenders are rejected'
);

select lives_ok(
  $$ select public.replace_rotation_roster('00000000-0000-0000-0000-000000000406', array['00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid]) $$,
  'a full member can set an ordered active roster'
);
reset role;
select lives_ok($$ select public.generate_calendar_occurrences('2026-08-02', '2026-08-09') $$, 'generation assigns the round-robin roster');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(
  (select string_agg(assignee_user_id::text, ',' order by original_due_start) from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000406' and original_due_start >= '2026-08-01'),
  '00000000-0000-0000-0000-000000000101,00000000-0000-0000-0000-000000000102',
  'new occurrences alternate from the persisted rotation basis'
);
select lives_ok(
  $$ select public.assign_occurrence((select id from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000406' and original_due_start >= '2026-08-01' order by original_due_start limit 1), '00000000-0000-0000-0000-000000000101', 1, true) $$,
  'a full member can lock a manual assignment'
);
select lives_ok(
  $$ select public.replace_rotation_roster('00000000-0000-0000-0000-000000000406', array['00000000-0000-0000-0000-000000000102'::uuid, '00000000-0000-0000-0000-000000000101'::uuid]) $$,
  'reordering recalculates future unlocked occurrences'
);
select is(
  (select assignment_source::text || ':' || assignment_locked::text || ':' || assignee_user_id::text from public.task_occurrences where series_id = '00000000-0000-0000-0000-000000000406' and original_due_start >= '2026-08-01' order by original_due_start limit 1),
  'manual:true:00000000-0000-0000-0000-000000000101',
  'recalculation preserves a manually locked assignment'
);
select ok(
  exists (select 1 from public.task_events where series_id = '00000000-0000-0000-0000-000000000406' and event_type = 'rotation_recalculated' and event_payload->>'version' = '1'),
  'recalculation appends a versioned audit event'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select throws_ok(
  $$ select public.claim_occurrence('00000000-0000-0000-0000-000000000707', 1) $$,
  '42501', 'active full membership is required', 'a guest cannot claim an unassigned occurrence'
);
reset role;

select * from finish();
rollback;
