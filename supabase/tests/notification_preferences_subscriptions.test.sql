begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted setup approves the administrator'
);
update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select is(
  (select count(*)::integer from public.notification_preferences),
  1,
  'a user reads only their own notification preferences'
);
select lives_ok(
  $$ update public.notification_preferences set due_soon_minutes = 15, show_task_details = false where user_id = auth.uid() $$,
  'an approved user updates their own global preferences'
);
select is(
  (select due_soon_minutes from public.notification_preferences where user_id = auth.uid()),
  15,
  'the owner preference update is visible'
);
update public.notification_preferences
set notify_overdue = false
where user_id = '00000000-0000-0000-0000-000000000101';
reset role;
select ok(
  (select notify_overdue from public.notification_preferences where user_id = '00000000-0000-0000-0000-000000000101'),
  'another user preference cannot be updated'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select lives_ok(
  $$
    insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_label)
    values (
      auth.uid(),
      'https://push.example.test/sam-phone',
      'sam-public-key',
      'sam-auth-key',
      'Sam phone'
    )
  $$,
  'an approved user registers their own device'
);
select is(
  (select count(*)::integer from public.push_subscriptions),
  1,
  'a user reads only their own device subscription'
);
select throws_ok(
  $$
    insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
    values (
      '00000000-0000-0000-0000-000000000101',
      'https://push.example.test/forged-owner',
      'forged-public-key',
      'forged-auth-key'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "push_subscriptions"',
  'a user cannot register a device for another owner'
);
select lives_ok(
  $$
    update public.push_subscriptions
    set enabled = false, disabled_at = pg_catalog.now()
    where endpoint = 'https://push.example.test/sam-phone'
  $$,
  'an owner can disable one device'
);
select ok(
  (
    select not enabled and disabled_at is not null
    from public.push_subscriptions
    where endpoint = 'https://push.example.test/sam-phone'
  ),
  'device disabling keeps the enabled and disabled timestamp invariant'
);
select ok(
  not pg_catalog.has_column_privilege('authenticated', 'public.push_subscriptions', 'last_success_at', 'update')
  and not pg_catalog.has_column_privilege('authenticated', 'public.push_subscriptions', 'last_failure_at', 'update'),
  'browser roles cannot forge delivery result timestamps'
);
reset role;

update public.platform_access
set status = 'suspended'
where user_id = '00000000-0000-0000-0000-000000000102';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select is(
  (select count(*)::integer from public.notification_preferences),
  0,
  'a suspended user cannot read notification preferences'
);
select is(
  (select count(*)::integer from public.push_subscriptions),
  0,
  'a suspended user cannot read push credentials'
);
reset role;

select * from finish();
rollback;
