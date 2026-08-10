begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table('public', 'platform_settings', 'platform signup policy is stored in the database');

select is(
  (select require_signup_approval from public.platform_settings where singleton),
  false,
  'new accounts activate automatically by default'
);

select ok(
  not has_table_privilege('authenticated', 'public.platform_settings', 'select'),
  'authenticated users cannot read platform settings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.platform_settings', 'update'),
  'authenticated users cannot update platform settings directly'
);

select ok(
  not has_function_privilege('anon', 'public.get_signup_approval_setting()', 'execute'),
  'anonymous users cannot read signup policy through the RPC'
);

select ok(
  not has_function_privilege('anon', 'public.set_signup_approval_setting(boolean)', 'execute'),
  'anonymous users cannot change signup policy through the RPC'
);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'the trusted bootstrap creates the platform administrator'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select throws_ok(
  $$ select public.set_signup_approval_setting(true) $$,
  '42501',
  'platform administrator access is required',
  'a non-administrator cannot change signup policy'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(
  (select require_signup_approval from public.get_signup_approval_setting()),
  false,
  'the administrator reads the automatic-activation default'
);
select is(
  public.set_signup_approval_setting(true),
  true,
  'the administrator can require approval for future signups'
);
reset role;

select is(
  (select updated_by from public.platform_settings where singleton),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'the setting records which administrator changed it'
);

select is(
  (select status::text from public.platform_access where user_id = '00000000-0000-0000-0000-000000000102'),
  'approved',
  'enabling signup approval does not change an existing account'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000105', 'u-waiting@auth.hometeam.invalid');

select is(
  (select status::text from public.platform_access where user_id = '00000000-0000-0000-0000-000000000105'),
  'pending',
  'a signup waits when approval is required'
);

select is(
  (
    select count(*)::integer
    from public.platform_access_events
    where user_id = '00000000-0000-0000-0000-000000000105'
      and previous_status is null
      and next_status = 'pending'
  ),
  1,
  'the pending signup state is recorded once'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select is(
  public.set_signup_approval_setting(false),
  false,
  'the administrator can restore automatic signup activation'
);
reset role;

select is(
  (select status::text from public.platform_access where user_id = '00000000-0000-0000-0000-000000000105'),
  'pending',
  'disabling signup approval does not rewrite an account already waiting'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000106', 'u-active@auth.hometeam.invalid');

select is(
  (select status::text from public.platform_access where user_id = '00000000-0000-0000-0000-000000000106'),
  'approved',
  'a signup activates when approval is not required'
);

select is(
  (
    select count(*)::integer
    from public.platform_access_events
    where user_id = '00000000-0000-0000-0000-000000000106'
      and previous_status is null
      and next_status = 'approved'
  ),
  1,
  'the automatic activation is recorded once'
);

select * from finish();

rollback;
