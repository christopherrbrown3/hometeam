begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'the trusted bootstrap makes the first administrator approved'
);

update public.platform_access
set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000103');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select throws_ok(
  $$ select public.set_platform_access_status('00000000-0000-0000-0000-000000000103', 'suspended') $$,
  '42501', 'platform administrator access is required',
  'an approved non-administrator cannot decide access'
);
select throws_ok(
  $$ select public.accept_household_invitation('not-a-real-token') $$,
  '22023', 'invitation is invalid, expired, or no longer active',
  'approved user receives no access without a valid invitation'
);
reset role;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000104', 'pending@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select throws_ok(
  $$ select public.create_household('Pending household', 'America/New_York') $$,
  '42501', 'approved platform access is required',
  'pending users cannot create households'
);
select throws_ok(
  $$ select public.accept_household_invitation('not-a-real-token') $$,
  '42501', 'approved platform access is required',
  'pending users cannot accept invitations even when they know a token'
);
select ok(
  not has_table_privilege('authenticated', 'public.platform_access', 'update'),
  'browser roles cannot directly change platform access'
);
select ok(
  not has_table_privilege('authenticated', 'public.platform_access_events', 'insert'),
  'browser roles cannot directly append access decisions'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.set_platform_access_status('00000000-0000-0000-0000-000000000104', 'approved') $$,
  'platform administrator can approve a pending account'
);
reset role;

select is(
  (select count(*)::integer from public.platform_access_events where user_id = '00000000-0000-0000-0000-000000000104' and next_status = 'approved'), 1,
  'one authoritative approval event is appended'
);

select * from finish();
rollback;
