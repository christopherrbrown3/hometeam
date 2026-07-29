begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public', 'edit_task_series', array['uuid', 'jsonb', 'text', 'timestamptz'], 'edit series scope RPC is present');
select has_function('public', 'delete_task_series', array['uuid'], 'soft delete RPC is present');
select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the administrator');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok($$ select public.edit_task_series('00000000-0000-0000-0000-000000000402', '{"title":"Feed the dog later"}'::jsonb, 'entire_series', now()) $$, 'a full member can apply an entire-series edit');
select is((select title from public.task_series where id = '00000000-0000-0000-0000-000000000402'), 'Feed the dog later', 'an edit updates the authoritative series');
select ok(exists (select 1 from public.task_events where series_id = '00000000-0000-0000-0000-000000000402' and event_type = 'series_updated'), 'an edit appends a series audit event');

reset role;
insert into public.task_occurrences (id, series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day)
values ('00000000-0000-0000-0000-000000000799', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', 'future-soft-delete', now() + interval '3 days', now() + interval '3 days 15 minutes', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok($$ select public.delete_task_series('00000000-0000-0000-0000-000000000401') $$, 'a full member can soft delete a series');
reset role;
select is((select series_status::text from public.task_series where id = '00000000-0000-0000-0000-000000000401'), 'deleted', 'the series remains as a deleted record');
select is((select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000799'), 'deleted', 'future open occurrences are soft deleted');
select is((select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000701'), 'deleted', 'already-due open occurrences are also removed from active task views');
select is((select lifecycle_state::text from public.task_occurrences where id = '00000000-0000-0000-0000-000000000704'), 'completed', 'completed history is retained');
select ok(exists (select 1 from public.task_events where series_id = '00000000-0000-0000-0000-000000000401' and event_type = 'series_deleted'), 'soft deletion appends an audit event');

reset role;
select * from finish();
rollback;
