begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function(
  'private',
  'enqueue_notifications',
  array['uuid', 'uuid', 'public.notification_type', 'text', 'timestamptz'],
  'the private notification recipient producer is present'
);
select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.enqueue_notifications(uuid, uuid, public.notification_type, text, timestamptz)',
    'execute'
  )
  and not pg_catalog.has_function_privilege(
    'service_role',
    'private.enqueue_notifications(uuid, uuid, public.notification_type, text, timestamptz)',
    'execute'
  ),
  'API roles cannot directly execute the privileged outbox producer'
);
select ok(
  not pg_catalog.has_table_privilege('authenticated', 'public.notification_outbox', 'select'),
  'browser roles cannot inspect notification work'
);

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

select is(
  private.enqueue_notifications(
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000101',
    'completed',
    'event:completed:one'
  ),
  1,
  'a lifecycle update queues one other full household member'
);
select is(
  (
    select recipient_user_id
    from public.notification_outbox
    where idempotency_key like 'completed:%:event:completed:one'
  ),
  '00000000-0000-0000-0000-000000000102'::uuid,
  'the actor is excluded and the other full member is selected'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where recipient_user_id = '00000000-0000-0000-0000-000000000103'
      and idempotency_key like '%:event:completed:one'
  ),
  0,
  'an unrelated guest never receives a household lifecycle notification'
);
select is(
  private.enqueue_notifications(
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000101',
    'completed',
    'event:completed:one'
  ),
  0,
  'replaying the same semantic notification is idempotent'
);

update public.notification_preferences
set notify_completed = false
where user_id = '00000000-0000-0000-0000-000000000102';
select is(
  private.enqueue_notifications(
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000101',
    'completed',
    'event:completed:preference-disabled'
  ),
  0,
  'a disabled preference suppresses notification work'
);
update public.notification_preferences
set notify_completed = true
where user_id = '00000000-0000-0000-0000-000000000102';

update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000103'
where id = '00000000-0000-0000-0000-000000000701';
select is(
  private.enqueue_notifications(
    '00000000-0000-0000-0000-000000000701',
    null,
    'due_soon',
    'schedule:due-soon:one'
  ),
  1,
  'a scheduled due notification selects the assigned guest'
);
select is(
  (
    select recipient_user_id
    from public.notification_outbox
    where idempotency_key like 'due_soon:%:schedule:due-soon:one'
  ),
  '00000000-0000-0000-0000-000000000103'::uuid,
  'guest delivery remains strictly assignment-scoped'
);

update public.platform_access
set status = 'suspended'
where user_id = '00000000-0000-0000-0000-000000000103';
select is(
  private.enqueue_notifications(
    '00000000-0000-0000-0000-000000000701',
    null,
    'due_soon',
    'schedule:due-soon:suspended'
  ),
  0,
  'a suspended recipient is excluded even while still assigned'
);

select throws_ok(
  $$
    select private.enqueue_notifications(
      '00000000-0000-0000-0000-000000000708',
      '00000000-0000-0000-0000-000000000102',
      'completed',
      'cross-household'
    )
  $$,
  '42501',
  'notification actor lacks active household access',
  'a cross-household actor cannot produce notification work'
);
select throws_ok(
  $$
    select private.enqueue_notifications(
      '00000000-0000-0000-0000-000000000701',
      null,
      'membership_changed',
      'wrong-target-kind'
    )
  $$,
  '22023',
  'membership notifications require a membership-scoped producer',
  'an occurrence producer rejects a membership-scoped notification'
);
select throws_ok(
  $$
    select private.enqueue_notifications(
      '00000000-0000-0000-0000-000000000701',
      null,
      'overdue',
      ''
    )
  $$,
  '22023',
  'an occurrence, notification type, bounded source key, and delivery time are required',
  'an empty semantic source key is rejected'
);

update public.platform_access
set status = 'approved', decided_at = pg_catalog.now(), decided_by = '00000000-0000-0000-0000-000000000101'
where user_id = '00000000-0000-0000-0000-000000000103';
update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000102',
    lifecycle_state = 'open',
    completed_by = null,
    completed_at = null,
    version = 1
where id = '00000000-0000-0000-0000-000000000702';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
select lives_ok(
  $$ select public.complete_occurrence('00000000-0000-0000-0000-000000000702', 1, false) $$,
  'the existing lifecycle RPC uses the new outbox producer'
);
reset role;
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000702'
      and notification_type = 'completed'
      and recipient_user_id = '00000000-0000-0000-0000-000000000101'
  ),
  1,
  'the lifecycle transaction writes one durable semantic notification'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000702'
      and recipient_user_id = '00000000-0000-0000-0000-000000000103'
  ),
  0,
  'the lifecycle integration does not leak notification work to a guest'
);
select is(
  (
    select payload
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000702'
      and recipient_user_id = '00000000-0000-0000-0000-000000000101'
  ),
  pg_catalog.jsonb_build_object(
    'version', 1,
    'occurrenceId', '00000000-0000-0000-0000-000000000702'::uuid,
    'notificationType', 'completed'
  ),
  'outbox payloads contain only the minimum routing contract'
);

select * from finish();
rollback;
