begin;

create extension if not exists pgtap with schema extensions;

\ir fixtures/two_households.sql

create function private.rls_matrix_visible_counts()
returns table (table_name text, visible_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'categories'::text, count(*)
  from public.categories
  where id in (
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000912',
    '00000000-0000-0000-0000-000000000913'
  )
  union all
  select 'household_memberships'::text, count(*)
  from public.household_memberships
  where id in (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000310',
    '00000000-0000-0000-0000-000000000311',
    '00000000-0000-0000-0000-000000000312',
    '00000000-0000-0000-0000-000000000313',
    '00000000-0000-0000-0000-000000000314'
  )
  union all
  select 'households'::text, count(*)
  from public.households
  where id in (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202'
  )
  union all
  select 'notification_preferences'::text, count(*)
  from public.notification_preferences
  where user_id in (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000107',
    '00000000-0000-0000-0000-000000000108',
    '00000000-0000-0000-0000-000000000109',
    '00000000-0000-0000-0000-000000000110'
  )
  union all
  select 'platform_access'::text, count(*)
  from public.platform_access
  where user_id in (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000107',
    '00000000-0000-0000-0000-000000000108',
    '00000000-0000-0000-0000-000000000109',
    '00000000-0000-0000-0000-000000000110'
  )
  union all
  select 'profiles'::text, count(*)
  from public.profiles
  where user_id in (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000107',
    '00000000-0000-0000-0000-000000000108',
    '00000000-0000-0000-0000-000000000109',
    '00000000-0000-0000-0000-000000000110'
  )
  union all
  select 'push_subscriptions'::text, count(*)
  from public.push_subscriptions
  where id between
    '00000000-0000-0000-0000-000000000951'::uuid and
    '00000000-0000-0000-0000-000000000958'::uuid
  union all
  select 'task_occurrences'::text, count(*)
  from public.task_occurrences
  where id in (
    '00000000-0000-0000-0000-000000000941',
    '00000000-0000-0000-0000-000000000942',
    '00000000-0000-0000-0000-000000000943'
  )
  union all
  select 'task_rotation_members'::text, count(*)
  from public.task_rotation_members
  where id = '00000000-0000-0000-0000-000000000934'
  union all
  select 'task_schedule_slots'::text, count(*)
  from public.task_schedule_slots
  where id in (
    '00000000-0000-0000-0000-000000000931',
    '00000000-0000-0000-0000-000000000932',
    '00000000-0000-0000-0000-000000000933'
  )
  union all
  select 'task_series'::text, count(*)
  from public.task_series
  where id in (
    '00000000-0000-0000-0000-000000000921',
    '00000000-0000-0000-0000-000000000922',
    '00000000-0000-0000-0000-000000000923'
  );
$$;

revoke all on function private.rls_matrix_visible_counts()
from public, anon, authenticated, service_role;
grant execute on function private.rls_matrix_visible_counts() to authenticated;

create temporary table rls_matrix_expected (
  actor_class text not null,
  table_name text not null,
  visible_count bigint not null,
  primary key (actor_class, table_name)
);
grant select on table pg_temp.rls_matrix_expected to authenticated;

insert into pg_temp.rls_matrix_expected (actor_class, table_name, visible_count) values
  ('full_member', 'categories', 2),
  ('full_member', 'household_memberships', 6),
  ('full_member', 'households', 1),
  ('full_member', 'notification_preferences', 1),
  ('full_member', 'platform_access', 1),
  ('full_member', 'profiles', 5),
  ('full_member', 'push_subscriptions', 1),
  ('full_member', 'task_occurrences', 2),
  ('full_member', 'task_rotation_members', 1),
  ('full_member', 'task_schedule_slots', 2),
  ('full_member', 'task_series', 2),
  ('guest', 'categories', 1),
  ('guest', 'household_memberships', 1),
  ('guest', 'households', 1),
  ('guest', 'notification_preferences', 1),
  ('guest', 'platform_access', 1),
  ('guest', 'profiles', 1),
  ('guest', 'push_subscriptions', 1),
  ('guest', 'task_occurrences', 1),
  ('guest', 'task_rotation_members', 0),
  ('guest', 'task_schedule_slots', 0),
  ('guest', 'task_series', 1),
  ('approved_outsider', 'categories', 0),
  ('approved_outsider', 'household_memberships', 0),
  ('approved_outsider', 'households', 0),
  ('approved_outsider', 'notification_preferences', 1),
  ('approved_outsider', 'platform_access', 1),
  ('approved_outsider', 'profiles', 1),
  ('approved_outsider', 'push_subscriptions', 1),
  ('approved_outsider', 'task_occurrences', 0),
  ('approved_outsider', 'task_rotation_members', 0),
  ('approved_outsider', 'task_schedule_slots', 0),
  ('approved_outsider', 'task_series', 0),
  ('removed', 'categories', 0),
  ('removed', 'household_memberships', 0),
  ('removed', 'households', 0),
  ('removed', 'notification_preferences', 1),
  ('removed', 'platform_access', 1),
  ('removed', 'profiles', 1),
  ('removed', 'push_subscriptions', 1),
  ('removed', 'task_occurrences', 0),
  ('removed', 'task_rotation_members', 0),
  ('removed', 'task_schedule_slots', 0),
  ('removed', 'task_series', 0),
  ('pending', 'categories', 0),
  ('pending', 'household_memberships', 0),
  ('pending', 'households', 0),
  ('pending', 'notification_preferences', 0),
  ('pending', 'platform_access', 1),
  ('pending', 'profiles', 1),
  ('pending', 'push_subscriptions', 0),
  ('pending', 'task_occurrences', 0),
  ('pending', 'task_rotation_members', 0),
  ('pending', 'task_schedule_slots', 0),
  ('pending', 'task_series', 0),
  ('rejected', 'categories', 0),
  ('rejected', 'household_memberships', 0),
  ('rejected', 'households', 0),
  ('rejected', 'notification_preferences', 0),
  ('rejected', 'platform_access', 1),
  ('rejected', 'profiles', 1),
  ('rejected', 'push_subscriptions', 0),
  ('rejected', 'task_occurrences', 0),
  ('rejected', 'task_rotation_members', 0),
  ('rejected', 'task_schedule_slots', 0),
  ('rejected', 'task_series', 0),
  ('suspended', 'categories', 0),
  ('suspended', 'household_memberships', 0),
  ('suspended', 'households', 0),
  ('suspended', 'notification_preferences', 0),
  ('suspended', 'platform_access', 1),
  ('suspended', 'profiles', 1),
  ('suspended', 'push_subscriptions', 0),
  ('suspended', 'task_occurrences', 0),
  ('suspended', 'task_rotation_members', 0),
  ('suspended', 'task_schedule_slots', 0),
  ('suspended', 'task_series', 0),
  ('administrator', 'categories', 0),
  ('administrator', 'household_memberships', 0),
  ('administrator', 'households', 0),
  ('administrator', 'notification_preferences', 1),
  ('administrator', 'platform_access', 8),
  ('administrator', 'profiles', 8),
  ('administrator', 'push_subscriptions', 1),
  ('administrator', 'task_occurrences', 0),
  ('administrator', 'task_rotation_members', 0),
  ('administrator', 'task_schedule_slots', 0),
  ('administrator', 'task_series', 0);

select plan(33);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
  ),
  19,
  'the release matrix inventories every public table'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ),
  0,
  'every public table has row-level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relforcerowsecurity
  ),
  0,
  'every public table forces row-level security'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges privilege
    where privilege.table_schema = 'public'
      and privilege.grantee = 'anon'
  ),
  0,
  'the anonymous role has no public-table privileges'
);

select is(
  (
    select pg_catalog.jsonb_agg(table_name order by table_name)
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and pg_catalog.has_table_privilege(
        'authenticated',
        pg_catalog.format('%I.%I', table_schema, table_name),
        'SELECT'
      )
  ),
  '["categories","household_memberships","households","notification_preferences","platform_access","profiles","push_subscriptions","task_occurrences","task_rotation_members","task_schedule_slots","task_series"]'::jsonb,
  'authenticated SELECT is limited to the documented policy-filtered surface'
);

select is(
  (
    select pg_catalog.jsonb_agg(table_name order by table_name)
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and not pg_catalog.has_table_privilege(
        'authenticated',
        pg_catalog.format('%I.%I', table_schema, table_name),
        'SELECT'
      )
  ),
  '["household_invitations","household_join_links","notification_delivery_attempts","notification_outbox","platform_access_events","platform_administrators","platform_settings","task_events"]'::jsonb,
  'secrets, privileged state, outbox work, and raw events have no browser read grant'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'full_member'),
  'an approved full member sees the complete first-household sentinel surface only'
);
select is(
  (select count(*)::integer from public.task_series where household_id = '00000000-0000-0000-0000-000000000202'),
  0,
  'a full membership never crosses into the second household'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000110', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'guest'),
  'an approved guest sees only their membership, assigned occurrence, and minimum parent projection'
);
select is(
  (select title from public.task_series where id = '00000000-0000-0000-0000-000000000921'),
  'Assigned guest sentinel'::text,
  'an assigned guest can load the parent title required by Today'
);
select is(
  (select count(*)::integer from public.task_series where id = '00000000-0000-0000-0000-000000000922'),
  0,
  'a guest cannot load an unassigned household task definition'
);
select is(
  (select name from public.categories where id = '00000000-0000-0000-0000-000000000911'),
  'Assigned guest sentinel'::text,
  'an assigned guest can load the category required by Today'
);
select is(
  (select count(*)::integer from public.categories where id = '00000000-0000-0000-0000-000000000912'),
  0,
  'a guest cannot browse unrelated household categories'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'approved_outsider'),
  'an approved outsider receives no household rows'
);
select throws_ok(
  $$ select public.claim_occurrence('00000000-0000-0000-0000-000000000942', 1) $$,
  '42501',
  'active full membership is required',
  'an approved outsider cannot mutate a household occurrence by ID'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000108', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'removed'),
  'a removed user immediately loses all former-household rows'
);
select throws_ok(
  $$ select public.claim_occurrence('00000000-0000-0000-0000-000000000942', 1) $$,
  '42501',
  'active full membership is required',
  'a removed user cannot mutate a former-household occurrence by ID'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000105', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'pending'),
  'a pending account receives only minimum profile and access state'
);
select throws_ok(
  $$ select public.create_household('Pending bypass', 'America/New_York') $$,
  '42501',
  'approved platform access is required',
  'a pending account cannot call a product RPC'
);
update public.profiles
set display_name = 'Pending bypass'
where user_id = '00000000-0000-0000-0000-000000000105';
select isnt(
  (select display_name from public.profiles where user_id = '00000000-0000-0000-0000-000000000105'),
  'Pending bypass'::text,
  'a pending account cannot update even its own profile'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000106', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'rejected'),
  'a rejected account receives only minimum profile and access state'
);
select throws_ok(
  $$ select public.create_household('Rejected bypass', 'America/New_York') $$,
  '42501',
  'approved platform access is required',
  'a rejected account cannot call a product RPC'
);
update public.profiles
set display_name = 'Rejected bypass'
where user_id = '00000000-0000-0000-0000-000000000106';
select isnt(
  (select display_name from public.profiles where user_id = '00000000-0000-0000-0000-000000000106'),
  'Rejected bypass'::text,
  'a rejected account cannot update even its own profile'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000107', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'suspended'),
  'a suspended member receives only minimum profile and access state'
);
select throws_ok(
  $$ select public.create_household('Suspended bypass', 'America/New_York') $$,
  '42501',
  'approved platform access is required',
  'a suspended account cannot call a product RPC'
);
update public.profiles
set display_name = 'Suspended bypass'
where user_id = '00000000-0000-0000-0000-000000000107';
select isnt(
  (select display_name from public.profiles where user_id = '00000000-0000-0000-0000-000000000107'),
  'Suspended bypass'::text,
  'a suspended account cannot update even its own profile'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000109', true);
select is(
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from private.rls_matrix_visible_counts()),
  (select pg_catalog.jsonb_object_agg(table_name, visible_count) from pg_temp.rls_matrix_expected where actor_class = 'administrator'),
  'a platform administrator receives account-review metadata but no household bypass'
);
select is(
  (select count(*)::integer from public.households),
  0,
  'administrator status alone grants no household identity rows'
);
select is(
  (
    select count(*)::integer
    from public.platform_access
    where user_id in (
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000104',
      '00000000-0000-0000-0000-000000000105',
      '00000000-0000-0000-0000-000000000106',
      '00000000-0000-0000-0000-000000000107',
      '00000000-0000-0000-0000-000000000108',
      '00000000-0000-0000-0000-000000000109',
      '00000000-0000-0000-0000-000000000110'
    )
  ),
  8,
  'the administrator can review the complete sentinel access-state set'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
select is(
  (select count(*)::integer from public.platform_access),
  1,
  'an approved non-administrator reads only their own access state'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000108', true);
select is(
  (select count(*)::integer from public.household_memberships),
  0,
  'a removed user cannot retain their former membership signal'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000110', true);
select is(
  (select count(*)::integer from public.household_memberships),
  1,
  'an active guest reads only their own membership signal'
);
reset role;

set local role anon;
select throws_ok(
  $$ select * from public.households $$,
  '42501',
  null,
  'an anonymous caller cannot read any household table'
);
reset role;

select * from finish();
rollback;
