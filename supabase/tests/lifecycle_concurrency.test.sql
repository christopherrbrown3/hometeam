begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function('public', 'complete_occurrence', array['uuid', 'bigint', 'boolean'], 'complete RPC is present');
select has_function('public', 'snooze_occurrence', array['uuid', 'bigint', 'timestamptz'], 'snooze RPC is present');
select has_function('public', 'skip_occurrence', array['uuid', 'bigint', 'text'], 'skip RPC is present');
select has_function('public', 'undo_completion', array['uuid', 'bigint'], 'undo RPC is present');
select has_function('public', 'reopen_occurrence', array['uuid', 'bigint'], 'reopen RPC is present');

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
update public.platform_access set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000103');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select lives_ok($$ select public.complete_occurrence('00000000-0000-0000-0000-000000000702', 1, false) $$, 'first complete contender wins');
select throws_ok($$ select public.skip_occurrence('00000000-0000-0000-0000-000000000702', 1, 'race') $$, '40001', 'stale occurrence version', 'second contender loses with the authoritative version conflict');
select is((select lifecycle_state::text || ':' || version::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000702'), 'completed:2', 'completion changes state and increments version exactly once');
select ok(exists (select 1 from public.task_events where occurrence_id = '00000000-0000-0000-0000-000000000702' and event_type = 'completed'), 'completion appends an immutable event');

select lives_ok($$ select public.snooze_occurrence('00000000-0000-0000-0000-000000000703', 1, now() + interval '30 minutes') $$, 'assigned full member can snooze');
select is((select version from public.task_occurrences where id = '00000000-0000-0000-0000-000000000703'), 2::bigint, 'snooze increments version exactly once');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select lives_ok($$ select public.complete_occurrence('00000000-0000-0000-0000-000000000708', 1, false) $$, 'an assigned guest can complete their occurrence');
select lives_ok($$ select public.undo_completion('00000000-0000-0000-0000-000000000708', 2) $$, 'the guest who completed can undo within thirty seconds');
select throws_ok($$ select public.cancel_occurrence('00000000-0000-0000-0000-000000000701', 1, 'forbidden') $$, '42501', 'active full membership is required', 'a guest cannot cancel an occurrence');

reset role;
select * from finish();
rollback;
