begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name, username, detected_timezone)
    values (
      '00000000-0000-0000-0000-000000000901',
      'Invalid timezone',
      'invalid_timezone',
      'Mars/Olympus_Mons'
    )
  $$,
  '22023',
  'timezone must be a valid IANA timezone name',
  'invalid IANA timezone is rejected'
);

select throws_ok(
  $$
    insert into public.household_memberships (id, household_id, user_id, role, invited_by)
    values (
      '00000000-0000-0000-0000-000000000902',
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000101',
      'full_member',
      '00000000-0000-0000-0000-000000000101'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "household_memberships_one_active_membership"',
  'duplicate active household membership is rejected'
);

select throws_ok(
  $$
    insert into public.task_occurrences (
      series_id, household_id, occurrence_key, original_due_start, original_due_end
    ) values (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000201',
      '2026-01-14T13:00:00Z',
      '2026-01-14T13:00:00Z',
      '2026-01-14T13:15:00Z'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "task_occurrences_series_key"',
  'duplicate series occurrence key is rejected'
);

insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
values (
  '00000000-0000-0000-0000-000000000101',
  'https://push.example.test/constraints',
  'test-public-key',
  'test-auth-key'
);

select throws_ok(
  $$
    insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
    values (
      '00000000-0000-0000-0000-000000000102',
      'https://push.example.test/constraints',
      'different-public-key',
      'different-auth-key'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "push_subscriptions_endpoint_key"',
  'duplicate push endpoint is rejected'
);

select lives_ok(
  $$
    insert into public.notification_outbox (recipient_user_id, notification_type, idempotency_key)
    values (
      '00000000-0000-0000-0000-000000000101',
      'due_soon',
      'constraints:duplicate'
    )
  $$,
  'first idempotency key is accepted'
);

select throws_ok(
  $$
    insert into public.notification_outbox (recipient_user_id, notification_type, idempotency_key)
    values (
      '00000000-0000-0000-0000-000000000101',
      'due_soon',
      'constraints:duplicate'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "notification_outbox_idempotency_key_key"',
  'duplicate notification idempotency key is rejected'
);

select ok(
  not pg_catalog.has_table_privilege(
    'authenticated',
    'public.notification_outbox',
    'select'
  ),
  'authenticated users cannot directly read the notification outbox'
);

select * from finish();

rollback;
