begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function('private', 'write_task_event', array['public.task_occurrences', 'uuid', 'public.task_event_type', 'jsonb'], 'safe occurrence event writer is present');
select has_trigger('public', 'task_events', 'task_events_reject_mutation', 'events have a database append-only trigger');
select ok(not pg_catalog.has_table_privilege('authenticated', 'public.task_events', 'insert'), 'clients cannot insert events directly');
select throws_ok(
  $$ update public.task_events set event_payload = '{}'::jsonb where id = '00000000-0000-0000-0000-000000000801' $$,
  '42501', 'task events are append-only', 'event updates are rejected even for a privileged test role'
);
select throws_ok(
  $$ delete from public.task_events where id = '00000000-0000-0000-0000-000000000801' $$,
  '42501', 'task events are append-only', 'event deletion is rejected even for a privileged test role'
);
select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
update public.platform_access set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000103';
insert into public.task_occurrences (id, series_id, household_id, occurrence_key, original_due_start, original_due_end, assignee_user_id)
values ('00000000-0000-0000-0000-000000000709', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', 'guest-event-fixture', now(), now() + interval '15 minutes', '00000000-0000-0000-0000-000000000103');
insert into public.task_events (id, household_id, series_id, occurrence_id, actor_user_id, event_type, event_payload)
values ('00000000-0000-0000-0000-000000000809', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000709', '00000000-0000-0000-0000-000000000101', 'assigned', '{}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select is((select count(*) from public.task_events where id = '00000000-0000-0000-0000-000000000809'), 1::bigint, 'an assigned guest can read the safe event for their occurrence');
reset role;

select * from finish();
rollback;
