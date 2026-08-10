begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'the trusted bootstrap creates an active first administrator'
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

select is(
  (select status::text from public.platform_access where user_id = '00000000-0000-0000-0000-000000000104'),
  'approved',
  'new accounts receive platform access automatically'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select lives_ok(
  $$ select public.create_household('Automatic household', 'America/New_York') $$,
  'a new account can use HomeTeam under the default automatic policy'
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
  $$ select public.set_platform_access_status('00000000-0000-0000-0000-000000000104', 'suspended') $$,
  'a platform administrator can suspend an active account'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select throws_ok(
  $$ select public.create_household('Suspended household', 'America/New_York') $$,
  '42501', 'approved platform access is required',
  'a suspended account cannot create households'
);
select throws_ok(
  $$ select public.accept_household_invitation('not-a-real-token') $$,
  '42501', 'approved platform access is required',
  'a suspended account cannot accept invitations even when it knows a token'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.set_platform_access_status('00000000-0000-0000-0000-000000000104', 'approved') $$,
  'a platform administrator can restore a suspended account'
);
reset role;

select is(
  (select count(*)::integer from public.platform_access_events where user_id = '00000000-0000-0000-0000-000000000104'),
  3,
  'automatic activation, suspension, and restoration are all recorded'
);

select * from finish();
rollback;
