begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

select lives_ok(
  $$ select private.bootstrap_platform_administrator('00000000-0000-0000-0000-000000000101') $$,
  'trusted setup approves the delivery recipient'
);

delete from public.notification_outbox;
update public.platform_access
set status = 'approved',
    decided_at = '2026-08-29T11:00:00Z',
    decided_by = '00000000-0000-0000-0000-000000000101'
where user_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102'
);
update public.task_occurrences
set lifecycle_state = 'open',
    assignee_user_id = '00000000-0000-0000-0000-000000000101',
    deleted_at = null
where id = '00000000-0000-0000-0000-000000000701';
update public.task_series
set series_status = 'active', deleted_at = null
where id = '00000000-0000-0000-0000-000000000401';
update public.notification_preferences
set notify_assigned = true, show_task_details = true
where user_id = '00000000-0000-0000-0000-000000000101';

insert into public.push_subscriptions (
  id, user_id, endpoint, p256dh_key, auth_key, device_label
) values
  (
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000101',
    'https://push.example.test/alex-phone',
    'phone-p256dh',
    'phone-auth',
    'Alex phone'
  ),
  (
    '00000000-0000-0000-0000-000000000912',
    '00000000-0000-0000-0000-000000000101',
    'https://push.example.test/alex-tablet',
    'tablet-p256dh',
    'tablet-auth',
    'Alex tablet'
  );

insert into public.notification_outbox (
  id, recipient_user_id, occurrence_id, notification_type, idempotency_key, not_before
) values (
  '00000000-0000-0000-0000-000000000921',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000701',
  'assigned',
  'delivery-test:first',
  '2026-08-29T11:00:00Z'
);

select has_table(
  'public',
  'notification_delivery_attempts',
  'per-device delivery attempts are durable'
);
select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.notification_delivery_attempts', 'select')
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'public.claim_notification_deliveries(timestamptz, integer, integer)',
    'execute'
  ),
  'browser roles cannot inspect endpoints or invoke the delivery worker'
);
select ok(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.claim_notification_deliveries(timestamptz, integer, integer)',
    'execute'
  ),
  'only the service worker role receives the claim boundary'
);

create temporary table first_claim as
select * from public.claim_notification_deliveries(
  '2026-08-29T12:00:00Z',
  10,
  300
);

select is((select count(*)::integer from first_claim), 2, 'one attempt is claimed for each enabled device');
select is(
  (select count(distinct outbox_id)::integer from first_claim),
  1,
  'both device attempts retain one recipient-level outbox identity'
);
select is(
  (select payload->>'body' from first_claim limit 1),
  'Medicine reminder',
  'task details are added only at the private delivery boundary'
);

select public.record_notification_delivery_result(
  input_attempt_id => (select attempt_id from first_claim where endpoint like '%phone'),
  input_outcome => 'sent',
  input_now => '2026-08-29T12:00:01Z'
);
select public.record_notification_delivery_result(
  input_attempt_id => (select attempt_id from first_claim where endpoint like '%tablet'),
  input_outcome => 'retryable',
  input_response_status => 429,
  input_error_code => 'push_rate_limited',
  input_now => '2026-08-29T12:00:01Z',
  input_retry_after_seconds => 90
);

select is(
  (select status from public.notification_outbox where id = '00000000-0000-0000-0000-000000000921'),
  'pending'::public.notification_outbox_status,
  'one transient device leaves aggregate work pending without undoing success'
);
select is(
  (
    select count(*)::integer
    from public.claim_notification_deliveries('2026-08-29T12:01:00Z', 10, 300)
  ),
  0,
  'Retry-After prevents an early claim'
);

create temporary table retry_claim as
select * from public.claim_notification_deliveries(
  '2026-08-29T12:01:31Z',
  10,
  300
);

select is((select count(*)::integer from retry_claim), 1, 'only the retryable device is claimed again');
select is(
  (select endpoint from retry_claim),
  'https://push.example.test/alex-tablet',
  'a successful device is never re-sent recipient retry work'
);
select is(
  (
    select count(*)::integer
    from public.notification_delivery_attempts
    where outbox_id = '00000000-0000-0000-0000-000000000921'
      and subscription_id = '00000000-0000-0000-0000-000000000911'
  ),
  1,
  'the successful device retains exactly one attempt'
);

select public.record_notification_delivery_result(
  input_attempt_id => (select attempt_id from retry_claim),
  input_outcome => 'permanent_failure',
  input_response_status => 410,
  input_error_code => 'push_subscription_gone',
  input_now => '2026-08-29T12:01:32Z'
);

select ok(
  (select enabled from public.push_subscriptions where id = '00000000-0000-0000-0000-000000000911')
  and not (select enabled from public.push_subscriptions where id = '00000000-0000-0000-0000-000000000912'),
  'HTTP 410 disables only the invalid device'
);
select is(
  (select status from public.notification_outbox where id = '00000000-0000-0000-0000-000000000921'),
  'sent'::public.notification_outbox_status,
  'one successful device makes the finished recipient work sent'
);

select public.record_notification_delivery_result(
  input_attempt_id => (select attempt_id from retry_claim),
  input_outcome => 'sent',
  input_now => '2026-08-29T12:02:00Z'
);
select is(
  (select status from public.notification_delivery_attempts where id = (select attempt_id from retry_claim)),
  'permanent_failure'::public.notification_delivery_status,
  'replayed result recording cannot rewrite a terminal attempt'
);

update public.notification_preferences
set notify_assigned = false
where user_id = '00000000-0000-0000-0000-000000000101';
insert into public.notification_outbox (
  id, recipient_user_id, occurrence_id, notification_type, idempotency_key, not_before
) values (
  '00000000-0000-0000-0000-000000000922',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000701',
  'assigned',
  'delivery-test:preference-revoked',
  '2026-08-29T11:00:00Z'
);
select is(
  (
    select count(*)::integer
    from public.claim_notification_deliveries('2026-08-29T12:03:00Z', 10, 300)
  ),
  0,
  'claim-time authorization suppresses a newly disabled preference'
);
select is(
  (select status from public.notification_outbox where id = '00000000-0000-0000-0000-000000000922'),
  'cancelled'::public.notification_outbox_status,
  'ineligible work is cancelled without revealing endpoint material'
);

update public.notification_preferences
set notify_assigned = true
where user_id = '00000000-0000-0000-0000-000000000101';
insert into public.notification_outbox (
  id, recipient_user_id, occurrence_id, notification_type, idempotency_key, not_before
) values (
  '00000000-0000-0000-0000-000000000923',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000701',
  'assigned',
  'delivery-test:stale-lease',
  '2026-08-29T11:00:00Z'
);
select is(
  (
    select count(*)::integer
    from public.claim_notification_deliveries('2026-08-29T12:04:00Z', 10, 300)
  ),
  1,
  'the remaining enabled device receives the new work once'
);
select is(
  (
    select count(*)::integer
    from public.claim_notification_deliveries('2026-08-29T12:09:01Z', 10, 300)
  ),
  1,
  'a stale processing lease becomes exactly one retry attempt'
);
select is(
  (
    select pg_catalog.max(attempt_number)
    from public.notification_delivery_attempts
    where outbox_id = '00000000-0000-0000-0000-000000000923'
  ),
  2,
  'stale recovery preserves monotonic per-device attempt numbers'
);

create temporary table scheduler_claim as
select * from public.claim_scheduled_task_run('2026-08-29T13:00:00Z', 120);
select ok(
  (select acquired and run_token is not null from scheduler_claim),
  'the scheduler acquires one durable run token'
);
select is(
  (
    select acquired
    from public.claim_scheduled_task_run('2026-08-29T13:00:01Z', 120)
  ),
  false,
  'an overlapping scheduler invocation cannot acquire the active lease'
);
select is(
  public.complete_scheduled_task_run(
    '00000000-0000-0000-0000-000000000999',
    '2026-10-28',
    null,
    '2026-08-29T13:00:02Z'
  ),
  false,
  'a forged run token cannot release the scheduler lease'
);
select is(
  public.complete_scheduled_task_run(
    (select run_token from scheduler_claim),
    '2026-10-28',
    null,
    '2026-08-29T13:00:03Z'
  ),
  true,
  'the owning run token releases the lease and persists its cursor'
);
select ok(
  (
    select acquired
    from public.claim_scheduled_task_run('2026-08-29T13:00:04Z', 120)
  ),
  'the next scheduled invocation can resume after completion'
);

select * from finish();
rollback;
