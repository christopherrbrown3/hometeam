begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

-- The first administrator is created only from the trusted database role.
select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted bootstrap creates the first administrator'
);

update public.platform_access
set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000103');

-- Sam is an approved full member of Maple Home but not Grandma House.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is(
  (select count(*)::integer from public.households), 1,
  'approved full member reads only their active household'
);
select is(
  (select count(*)::integer from public.task_series where household_id = '00000000-0000-0000-0000-000000000202'), 0,
  'a household membership never grants another household series'
);
reset role;

-- Give the approved guest one explicit Maple occurrence and prove the guest cannot
-- enumerate its parent series or somebody else's occurrence.
update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000103'
where id = '00000000-0000-0000-0000-000000000701';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
select is(
  (select count(*)::integer from public.task_occurrences where household_id = '00000000-0000-0000-0000-000000000201'), 1,
  'guest reads only the explicitly assigned occurrence'
);
select is(
  (select count(*)::integer from public.task_series where household_id = '00000000-0000-0000-0000-000000000201'), 0,
  'guest cannot read household-wide task definitions'
);
select ok(
  not has_table_privilege('authenticated', 'public.household_invitations', 'select'),
  'invitation token hashes are never readable by browser roles'
);
reset role;

-- A platform administrator is not a household role.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000104', 'operator@example.test');
update public.platform_access set status = 'approved' where user_id = '00000000-0000-0000-0000-000000000104';
insert into public.platform_administrators (user_id) values ('00000000-0000-0000-0000-000000000104');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select is(
  (select count(*)::integer from public.platform_access), 4,
  'platform administrator can review access requests'
);
select is(
  (select count(*)::integer from public.households), 0,
  'platform administrator has no household-data bypass'
);
reset role;

-- Revocation immediately removes product-table access while preserving own status.
update public.platform_access set status = 'suspended' where user_id = '00000000-0000-0000-0000-000000000102';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is((select count(*)::integer from public.households), 0, 'suspended user is product-data isolated');
select is((select count(*)::integer from public.platform_access), 1, 'suspended user can still read only their access state');
reset role;

select * from finish();
rollback;
