begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select is(
  (select count(*)::integer from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('platform_access', 'household_memberships', 'task_series', 'task_occurrences', 'task_events')),
  5,
  'the authorized product-state tables are published for Realtime'
);

select lives_ok($$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$, 'trusted setup approves the first administrator');
update public.platform_access set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101' where user_id = '00000000-0000-0000-0000-000000000103';
update public.task_occurrences set assignee_user_id = '00000000-0000-0000-0000-000000000103' where id = '00000000-0000-0000-0000-000000000701';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select is((select count(*)::integer from public.task_occurrences where household_id = '00000000-0000-0000-0000-000000000201'), 1, 'guest can receive only the assigned occurrence signal');
select is((select count(*)::integer from public.task_series where household_id = '00000000-0000-0000-0000-000000000201'), 0, 'guest cannot receive household-wide series signals');
select is((select count(*)::integer from public.household_memberships where household_id = '00000000-0000-0000-0000-000000000201'), 1, 'guest can read only their own membership signal');
reset role;

update public.household_memberships set status = 'removed', removed_at = now() where id = '00000000-0000-0000-0000-000000000303';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select is((select count(*)::integer from public.task_occurrences where household_id = '00000000-0000-0000-0000-000000000201'), 0, 'removed guest cannot refetch previously assigned occurrence data');
select is((select count(*)::integer from public.task_events where household_id = '00000000-0000-0000-0000-000000000201'), 0, 'removed guest cannot receive or refetch related event data');
reset role;

select * from finish();
rollback;
