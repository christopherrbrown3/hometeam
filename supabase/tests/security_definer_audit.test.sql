begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

create function public.security_default_acl_probe()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select true $$;

create function private.security_default_acl_probe()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select true $$;

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname in ('public', 'private')
      and pg_catalog.pg_get_userbyid(function.proowner) <> 'postgres'
  ),
  0,
  'every application function is owned by the unexposed migration role'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname in ('public', 'private')
      and not exists (
        select 1
        from pg_catalog.unnest(coalesce(function.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ),
  0,
  'every application function pins its search_path'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    cross join lateral pg_catalog.unnest(coalesce(function.proconfig, '{}'::text[])) setting
    where namespace.nspname in ('public', 'private')
      and setting like 'search_path=%'
      and setting not in (
        'search_path=pg_catalog',
        'search_path=pg_catalog, public, private',
        'search_path=""'
      )
  ),
  0,
  'application search paths contain only reviewed non-client-writable schemas'
);

select is(
  (
    select count(*)::integer
    from (values
      ('anon'::text, 'public'::text),
      ('anon'::text, 'private'::text),
      ('authenticated'::text, 'public'::text),
      ('authenticated'::text, 'private'::text),
      ('service_role'::text, 'public'::text),
      ('service_role'::text, 'private'::text),
      ('authenticator'::text, 'public'::text),
      ('authenticator'::text, 'private'::text)
    ) candidate(role_name, schema_name)
    where pg_catalog.has_schema_privilege(
      candidate.role_name,
      candidate.schema_name,
      'CREATE'
    )
  ),
  0,
  'no API role can create an object in a function search-path schema'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(function.proacl, pg_catalog.acldefault('f', function.proowner))
    ) privilege
    where namespace.nspname in ('public', 'private')
      and function.prosecdef
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0,
  'no SECURITY DEFINER function inherits EXECUTE for PUBLIC'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname in ('public', 'private')
      and function.prosecdef
      and pg_catalog.has_function_privilege('anon', function.oid, 'EXECUTE')
  ),
  0,
  'the anonymous API role can execute no SECURITY DEFINER function'
);

select is(
  (
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_array(
        function.proname,
        pg_catalog.pg_get_function_identity_arguments(function.oid)
      )
      order by function.proname, pg_catalog.pg_get_function_identity_arguments(function.oid)
    )
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.prosecdef
      and pg_catalog.has_function_privilege('authenticated', function.oid, 'EXECUTE')
  ),
  '[["is_active_full_member","target_household_id uuid, target_user_id uuid"],["is_active_member","target_household_id uuid, target_user_id uuid"],["is_approved_user","target_user_id uuid"],["is_platform_administrator","target_user_id uuid"]]'::jsonb,
  'authenticated private execution is limited to the four RLS predicates'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and pg_catalog.has_function_privilege('authenticated', function.oid, 'EXECUTE')
      and pg_catalog.strpos(
        pg_catalog.lower(pg_catalog.pg_get_functiondef(function.oid)),
        'auth.uid()'
      ) = 0
  ),
  0,
  'every authenticated SECURITY DEFINER RPC resolves its actor from auth.uid()'
);

select is(
  (
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_array(
        function.proname,
        pg_catalog.pg_get_function_identity_arguments(function.oid)
      )
      order by function.proname, pg_catalog.pg_get_function_identity_arguments(function.oid)
    )
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and pg_catalog.has_function_privilege('service_role', function.oid, 'EXECUTE')
      and not pg_catalog.has_function_privilege('authenticated', function.oid, 'EXECUTE')
  ),
  '[["apply_missed_policies","input_now timestamp with time zone"],["claim_notification_deliveries","input_now timestamp with time zone, input_limit integer, input_stale_after_seconds integer"],["claim_scheduled_task_run","input_now timestamp with time zone, input_lease_seconds integer"],["complete_scheduled_task_run","input_run_token uuid, input_generation_through date, input_error text, input_now timestamp with time zone"],["generate_calendar_occurrences","input_from date, input_through date"],["produce_scheduled_notifications","input_now timestamp with time zone, input_limit integer"],["record_notification_delivery_result","input_attempt_id uuid, input_outcome text, input_response_status integer, input_error_code text, input_now timestamp with time zone, input_retry_after_seconds integer"]]'::jsonb,
  'service-only SECURITY DEFINER RPCs match the reviewed scheduler/delivery allowlist'
);

select is(
  (
    select pg_catalog.jsonb_agg(function.proname order by function.proname)
    from pg_catalog.pg_trigger trigger
    join pg_catalog.pg_proc function on function.oid = trigger.tgfoid
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where not trigger.tgisinternal
      and namespace.nspname = 'private'
      and function.prosecdef
  ),
  '["enqueue_new_task_notification","handle_new_auth_user"]'::jsonb,
  'only the two trigger paths that cross a real privilege boundary remain SECURITY DEFINER'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger trigger
    join pg_catalog.pg_proc function on function.oid = trigger.tgfoid
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(function.proacl, pg_catalog.acldefault('f', function.proowner))
    ) privilege
    left join pg_catalog.pg_roles grantee on grantee.oid = privilege.grantee
    where not trigger.tgisinternal
      and namespace.nspname = 'private'
      and function.prosecdef
      and privilege.privilege_type = 'EXECUTE'
      and (
        privilege.grantee = 0
        or grantee.rolname in ('anon', 'authenticated', 'service_role', 'authenticator')
      )
  ),
  0,
  'privileged trigger functions are executable only by their owner'
);

select ok(
  not (
    select function.prosecdef
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'reject_task_event_mutation'
      and pg_catalog.pg_get_function_identity_arguments(function.oid) = ''
  ),
  'the append-only guard uses caller privileges because it needs no elevation'
);

select has_trigger(
  'public',
  'task_events',
  'task_events_reject_mutation',
  'task_events retains its append-only database trigger'
);

select is(
  (
    select pg_catalog.jsonb_agg(event_manipulation order by event_manipulation)
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'task_events'
      and trigger_name = 'task_events_reject_mutation'
  ),
  '["DELETE","UPDATE"]'::jsonb,
  'the append-only trigger rejects both UPDATE and DELETE'
);

select ok(
  not pg_catalog.has_table_privilege(
    'authenticated',
    'public.task_events',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
  ),
  'browser clients hold no direct task_events privilege'
);

select ok(
  not pg_catalog.has_table_privilege(
    'service_role',
    'public.task_events',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
  ),
  'service clients also use controlled event writers instead of direct table privileges'
);

select throws_ok(
  $$ update public.task_events set event_payload = '{}'::jsonb where id = '00000000-0000-0000-0000-000000000801' $$,
  '42501',
  'task events are append-only',
  'the trigger rejects a privileged event update'
);

select throws_ok(
  $$ delete from public.task_events where id = '00000000-0000-0000-0000-000000000801' $$,
  '42501',
  'task events are append-only',
  'the trigger rejects a privileged event deletion'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(function.proacl, pg_catalog.acldefault('f', function.proowner))
    ) privilege
    left join pg_catalog.pg_roles grantee on grantee.oid = privilege.grantee
    where function.proname = 'security_default_acl_probe'
      and namespace.nspname in ('public', 'private')
      and privilege.privilege_type = 'EXECUTE'
      and (
        privilege.grantee = 0
        or grantee.rolname in ('anon', 'authenticated', 'service_role', 'authenticator')
      )
  ),
  0,
  'new public and private functions inherit no API execution grant'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc function
    join pg_catalog.pg_namespace namespace on namespace.oid = function.pronamespace
    where function.proname = 'security_default_acl_probe'
      and namespace.nspname in ('public', 'private')
      and pg_catalog.pg_get_userbyid(function.proowner) = 'postgres'
  ),
  2,
  'both default-ACL probes remain owned by the migration role'
);

select * from finish();
rollback;
