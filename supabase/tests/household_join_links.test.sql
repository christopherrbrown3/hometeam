begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select is(
  (select count(*)::integer from public.categories where household_id = '00000000-0000-0000-0000-000000000201'),
  8,
  'seed households receive the useful default category set'
);

select ok(
  not has_table_privilege('authenticated', 'public.household_join_links', 'select'),
  'browser roles cannot read join-link token hashes'
);

select ok(
  not has_function_privilege('anon', 'public.create_household_join_link(uuid, public.household_member_role, integer)', 'execute'),
  'anonymous users cannot create household join links'
);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted bootstrap approves the household creator'
);

create temporary table created_household (id uuid);
grant select, insert on created_household to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
insert into created_household select id from public.create_household('Defaults Test Home', 'America/New_York');
reset role;

select is(
  (select count(*)::integer from public.categories where household_id = (select id from created_household)),
  8,
  'new households receive default categories transactionally'
);

create temporary table created_link (
  join_link_id uuid,
  token text,
  expires_at timestamptz,
  role public.household_member_role,
  max_uses integer
);
grant select, insert on created_link to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
insert into created_link
select * from public.create_household_join_link(
  '00000000-0000-0000-0000-000000000201',
  'guest'
);
reset role;

select is(
  (select max_uses from created_link),
  12,
  'a share link has a bounded usage cap'
);

select isnt(
  (select token_hash from public.household_join_links where id = (select join_link_id from created_link)),
  (select token from created_link),
  'only a hash of the bearer token is persisted'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000104', 'joiner@auth.hometeam.invalid');

update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000104';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select public.accept_household_join_link((select token from created_link));
reset role;

select is(
  (
    select role::text
    from public.household_memberships
    where household_id = '00000000-0000-0000-0000-000000000201'
      and user_id = '00000000-0000-0000-0000-000000000104'
      and status = 'active'
  ),
  'guest',
  'an approved account can join with the link role'
);

select is(
  (select use_count::integer from public.household_join_links where id = (select join_link_id from created_link)),
  1,
  'joining consumes one use'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select public.revoke_household_join_link((select join_link_id from created_link));
reset role;

select ok(
  (select revoked_at is not null from public.household_join_links where id = (select join_link_id from created_link)),
  'a full member can immediately revoke the link'
);

select * from finish();
rollback;
