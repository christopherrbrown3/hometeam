begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function(
  'public',
  'produce_scheduled_notifications',
  array['timestamptz', 'integer'],
  'the bounded scheduled notification producer is present'
);
select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.produce_scheduled_notifications(timestamptz, integer)',
    'execute'
  )
  and pg_catalog.has_function_privilege(
    'service_role',
    'public.produce_scheduled_notifications(timestamptz, integer)',
    'execute'
  ),
  'only the trusted service role can invoke scheduled production'
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

update public.task_occurrences
set assignee_user_id = null,
    assignment_source = 'unassigned',
    lifecycle_state = 'open',
    snoozed_until = null,
    version = 1
where id = '00000000-0000-0000-0000-000000000701';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$
    select public.assign_occurrence(
      '00000000-0000-0000-0000-000000000701',
      '00000000-0000-0000-0000-000000000102',
      1,
      false
    )
  $$,
  'manual assignment remains an atomic lifecycle mutation'
);
reset role;
select set_config('request.jwt.claim.sub', '', true);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000701'
      and recipient_user_id = '00000000-0000-0000-0000-000000000102'
      and notification_type = 'assigned'
  ),
  1,
  'manual assignment queues one notification for the new assignee'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000701'
      and recipient_user_id = '00000000-0000-0000-0000-000000000101'
  ),
  0,
  'the assigning actor is not notified about their own action'
);

insert into public.task_series (
  id,
  household_id,
  title,
  series_type,
  recurrence_type,
  recurrence_config,
  assignment_mode,
  fixed_assignee_id,
  effective_from,
  created_by
) values (
  '00000000-0000-0000-0000-000000000490',
  '00000000-0000-0000-0000-000000000201',
  'Producer fixture',
  'one_time',
  'one_time',
  '{"version":1}',
  'fixed',
  '00000000-0000-0000-0000-000000000102',
  '2026-01-20',
  '00000000-0000-0000-0000-000000000101'
);
insert into public.task_occurrences (
  id,
  series_id,
  household_id,
  occurrence_key,
  original_due_start,
  original_due_end,
  assignee_user_id,
  assignment_source
) values (
  '00000000-0000-0000-0000-000000000790',
  '00000000-0000-0000-0000-000000000490',
  '00000000-0000-0000-0000-000000000201',
  'producer:new-task',
  '2026-01-20T14:00:00Z',
  '2026-01-20T14:15:00Z',
  '00000000-0000-0000-0000-000000000102',
  'fixed'
);
set constraints task_series_enqueue_new_task immediate;
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000790'
      and notification_type = 'new_task'
      and recipient_user_id = '00000000-0000-0000-0000-000000000102'
  ),
  1,
  'new task creation queues full-member work in the same transaction'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000790'
      and notification_type = 'assigned'
      and recipient_user_id = '00000000-0000-0000-0000-000000000102'
  ),
  1,
  'new task creation also notifies a different first assignee'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000790'
      and recipient_user_id = '00000000-0000-0000-0000-000000000103'
  ),
  0,
  'a guest does not receive household-wide new task notifications'
);

delete from public.notification_outbox;
update public.task_occurrences
set lifecycle_state = 'cancelled'
where id not in (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000702',
  '00000000-0000-0000-0000-000000000703'
);
update public.notification_preferences
set due_soon_minutes = 30, notify_due_soon = true, notify_overdue = true
where user_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102'
);
update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000102',
    original_due_start = '2026-01-20T12:20:00Z',
    original_due_end = '2026-01-20T12:35:00Z',
    is_all_day = false,
    lifecycle_state = 'open',
    snoozed_until = null,
    deleted_at = null
where id = '00000000-0000-0000-0000-000000000701';
update public.task_occurrences
set assignee_user_id = null,
    original_due_start = '2026-01-20T10:00:00Z',
    original_due_end = '2026-01-20T11:00:00Z',
    is_all_day = false,
    lifecycle_state = 'open',
    snoozed_until = null,
    deleted_at = null
where id = '00000000-0000-0000-0000-000000000702';
update public.task_occurrences
set assignee_user_id = '00000000-0000-0000-0000-000000000102',
    original_due_start = '2026-01-20T09:00:00Z',
    original_due_end = '2026-01-20T10:00:00Z',
    lifecycle_state = 'open',
    snoozed_until = '2026-01-20T13:00:00Z',
    deleted_at = null
where id = '00000000-0000-0000-0000-000000000703';

select is(
  public.produce_scheduled_notifications('2026-01-20T12:00:00Z', 20),
  3,
  'a bounded scan queues one due-soon and two unassigned overdue recipients'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000701'
      and notification_type = 'due_soon'
      and recipient_user_id = '00000000-0000-0000-0000-000000000102'
  ),
  1,
  'due-soon production honors the assignee lead time'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000702'
      and notification_type = 'overdue'
  ),
  2,
  'an unassigned overdue occurrence notifies eligible full members'
);
select is(
  (
    select count(*)::integer
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000703'
  ),
  0,
  'a future snooze suppresses due and overdue production'
);
select is(
  public.produce_scheduled_notifications('2026-01-20T12:00:00Z', 20),
  0,
  'replaying the same scheduled scan is idempotent'
);
select throws_ok(
  $$ select public.produce_scheduled_notifications('2026-01-20T12:00:00Z', 0) $$,
  '22023',
  'a processing time and limit between 1 and 500 are required',
  'an invalid producer bound is rejected'
);
select is(
  (
    select payload
    from public.notification_outbox
    where occurrence_id = '00000000-0000-0000-0000-000000000701'
      and notification_type = 'due_soon'
  ),
  pg_catalog.jsonb_build_object(
    'version', 1,
    'occurrenceId', '00000000-0000-0000-0000-000000000701'::uuid,
    'notificationType', 'due_soon'
  ),
  'scheduled payloads retain the privacy-minimal outbox contract'
);

select * from finish();
rollback;
