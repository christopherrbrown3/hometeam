begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select has_column('public', 'profiles', 'username', 'profiles expose usernames');
select hasnt_column('public', 'profiles', 'email', 'profiles do not retain email identities');

select throws_ok(
  $$ insert into public.profiles (user_id, display_name, username) values ('00000000-0000-0000-0000-000000000904', 'Invalid', 'not valid') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_has_supported_format"',
  'profiles reject unsupported usernames'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000104', 'u-invitee@auth.hometeam.invalid');

select is(
  (select username from public.profiles where user_id = '00000000-0000-0000-0000-000000000104'),
  'invitee',
  'the auth trigger derives the product username from the internal identifier'
);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted bootstrap creates an administrator for invitation tests'
);

update public.platform_access
set status = 'approved', decided_at = now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000104';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ select public.create_household_invitation('00000000-0000-0000-0000-000000000201', 'invitee', 'guest') $$,
  'a full member can create a username-bound invitation'
);
reset role;

select is(
  (select invited_username from public.household_invitations order by created_at desc limit 1),
  'invitee',
  'invitations store normalized usernames rather than emails'
);

select * from finish();

rollback;
