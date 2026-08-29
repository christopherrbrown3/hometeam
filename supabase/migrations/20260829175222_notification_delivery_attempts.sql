-- Issues #75 and #77: process recipient-level outbox work as isolated,
-- idempotent per-device deliveries. Browser roles never receive direct access
-- to delivery attempts, endpoint material, or the worker RPCs below.

create type public.notification_delivery_status as enum (
  'processing',
  'sent',
  'retryable',
  'permanent_failure'
);

create table public.notification_delivery_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  attempt_number integer not null,
  status public.notification_delivery_status not null default 'processing',
  response_status integer,
  error_code text,
  started_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  next_retry_at timestamptz,
  constraint notification_delivery_attempt_number_is_positive
    check (attempt_number > 0),
  constraint notification_delivery_response_status_is_http
    check (response_status is null or response_status between 100 and 599),
  constraint notification_delivery_error_code_is_bounded
    check (error_code is null or pg_catalog.char_length(error_code) between 1 and 80),
  constraint notification_delivery_completion_is_consistent
    check (
      (status = 'processing' and completed_at is null and next_retry_at is null)
      or (status = 'retryable' and completed_at is not null and next_retry_at is not null)
      or (status in ('sent', 'permanent_failure') and completed_at is not null and next_retry_at is null)
    ),
  constraint notification_delivery_attempt_key unique (outbox_id, subscription_id, attempt_number)
);

create unique index notification_delivery_one_processing_per_device
  on public.notification_delivery_attempts (outbox_id, subscription_id)
  where status = 'processing';

create index notification_delivery_retry_queue
  on public.notification_delivery_attempts (next_retry_at, outbox_id)
  where status = 'retryable';

alter table public.notification_delivery_attempts enable row level security;
alter table public.notification_delivery_attempts force row level security;

revoke all on table public.notification_delivery_attempts
from public, anon, authenticated, service_role;

create function private.notification_outbox_is_eligible(
  target public.notification_outbox,
  input_now timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.task_occurrences occurrence
    join public.task_series series on series.id = occurrence.series_id
    join public.household_memberships membership
      on membership.household_id = occurrence.household_id
      and membership.user_id = target.recipient_user_id
      and membership.status = 'active'
      and membership.removed_at is null
    join public.platform_access access
      on access.user_id = target.recipient_user_id
      and access.status = 'approved'
    left join public.notification_preferences preference
      on preference.user_id = target.recipient_user_id
    where occurrence.id = target.occurrence_id
      and occurrence.deleted_at is null
      and series.deleted_at is null
      and series.series_status = 'active'
      and (membership.role = 'full_member' or occurrence.assignee_user_id = target.recipient_user_id)
      and case target.notification_type
        when 'assigned'::public.notification_type then
          occurrence.lifecycle_state = 'open'
          and occurrence.assignee_user_id = target.recipient_user_id
          and coalesce(preference.notify_assigned, true)
        when 'due_soon'::public.notification_type then
          occurrence.lifecycle_state = 'open'
          and occurrence.assignee_user_id = target.recipient_user_id
          and coalesce(preference.notify_due_soon, true)
        when 'overdue'::public.notification_type then
          occurrence.lifecycle_state = 'open'
          and occurrence.original_due_end < input_now
          and (
            occurrence.assignee_user_id = target.recipient_user_id
            or (occurrence.assignee_user_id is null and membership.role = 'full_member')
          )
          and coalesce(preference.notify_overdue, true)
        when 'completed'::public.notification_type then
          occurrence.lifecycle_state = 'completed'
          and membership.role = 'full_member'
          and coalesce(preference.notify_completed, true)
        when 'skipped'::public.notification_type then
          occurrence.lifecycle_state = 'skipped'
          and membership.role = 'full_member'
          and coalesce(preference.notify_skipped, true)
        when 'snoozed'::public.notification_type then
          occurrence.lifecycle_state = 'open'
          and occurrence.snoozed_until > input_now
          and membership.role = 'full_member'
          and coalesce(preference.notify_snoozed, true)
        when 'new_task'::public.notification_type then
          membership.role = 'full_member'
          and coalesce(preference.notify_new_task, true)
        else false
      end
  );
$$;

create function private.build_notification_push_payload(
  target public.notification_outbox
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select case
    when coalesce(preference.show_task_details, true) then
      pg_catalog.jsonb_build_object(
        'version', 1,
        'title', case target.notification_type
          when 'assigned' then 'Task assigned'
          when 'due_soon' then 'Task due soon'
          when 'overdue' then 'Task overdue'
          when 'completed' then 'Task completed'
          when 'skipped' then 'Task skipped'
          when 'snoozed' then 'Task snoozed'
          when 'new_task' then 'New household task'
          else 'Household task update'
        end,
        'body', series.title,
        'occurrenceId', occurrence.id,
        'notificationType', target.notification_type::text,
        'url', '/?occurrence=' || occurrence.id::text
      )
    else
      pg_catalog.jsonb_build_object(
        'version', 1,
        'title', 'Household task update',
        'body', 'Open HomeTeam to view this update.',
        'occurrenceId', occurrence.id,
        'notificationType', target.notification_type::text,
        'url', '/?occurrence=' || occurrence.id::text
      )
  end
  from public.task_occurrences occurrence
  join public.task_series series on series.id = occurrence.series_id
  left join public.notification_preferences preference
    on preference.user_id = target.recipient_user_id
  where occurrence.id = target.occurrence_id;
$$;

create function public.claim_notification_deliveries(
  input_now timestamptz default pg_catalog.now(),
  input_limit integer default 50,
  input_stale_after_seconds integer default 300
)
returns table (
  attempt_id uuid,
  outbox_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text,
  payload jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  candidate public.notification_outbox;
  delivery public.push_subscriptions;
  claimed_count integer := 0;
  next_attempt_number integer;
begin
  if input_now is null
    or input_limit not between 1 and 100
    or input_stale_after_seconds not between 30 and 3600 then
    raise exception using
      errcode = '22023',
      message = 'a processing time, limit between 1 and 100, and stale window between 30 and 3600 seconds are required';
  end if;

  -- Recover leases left behind by a crashed worker. A new attempt row is used
  -- for the retry, preserving an immutable audit trail.
  with stale_attempt_ids as (
    select attempt.id
    from public.notification_delivery_attempts attempt
    where attempt.status = 'processing'
      and attempt.started_at <= input_now - pg_catalog.make_interval(secs => input_stale_after_seconds)
    order by attempt.started_at, attempt.id
    limit input_limit
    for update skip locked
  ), stale_attempts as (
    update public.notification_delivery_attempts attempt
    set status = 'retryable',
        completed_at = input_now,
        next_retry_at = input_now,
        error_code = 'worker_lease_expired'
    where attempt.id in (select stale.id from stale_attempt_ids stale)
    returning attempt.outbox_id
  )
  update public.notification_outbox outbox
  set status = 'pending',
      not_before = least(outbox.not_before, input_now),
      last_error = 'worker_lease_expired'
  where outbox.id in (select stale.outbox_id from stale_attempts stale)
    and outbox.status = 'processing';

  -- Work is re-authorized immediately before endpoint material is returned.
  with ineligible_outbox as (
    select outbox.id
    from public.notification_outbox outbox
    where outbox.status = 'pending'
      and outbox.not_before <= input_now
      and not private.notification_outbox_is_eligible(outbox, input_now)
    order by outbox.not_before, outbox.created_at, outbox.id
    limit input_limit
    for update skip locked
  )
  update public.notification_outbox outbox
  set status = 'cancelled',
      last_error = 'recipient_no_longer_eligible'
  where outbox.id in (select bounded_outbox.id from ineligible_outbox bounded_outbox);

  with unsubscribed_outbox as (
    select outbox.id
    from public.notification_outbox outbox
    where outbox.status = 'pending'
      and outbox.not_before <= input_now
      and private.notification_outbox_is_eligible(outbox, input_now)
      and not exists (
        select 1
        from public.push_subscriptions subscription
        where subscription.user_id = outbox.recipient_user_id
          and subscription.enabled
      )
    order by outbox.not_before, outbox.created_at, outbox.id
    limit input_limit
    for update skip locked
  )
  update public.notification_outbox outbox
  set status = 'cancelled',
      last_error = 'no_enabled_push_subscription'
  where outbox.id in (select bounded_outbox.id from unsubscribed_outbox bounded_outbox);

  for candidate in
    select outbox.*
    from public.notification_outbox outbox
    where outbox.status = 'pending'
      and outbox.not_before <= input_now
      and private.notification_outbox_is_eligible(outbox, input_now)
      and exists (
        select 1
        from public.push_subscriptions subscription
        where subscription.user_id = outbox.recipient_user_id
          and subscription.enabled
          and not exists (
            select 1
            from public.notification_delivery_attempts terminal_attempt
            where terminal_attempt.outbox_id = outbox.id
              and terminal_attempt.subscription_id = subscription.id
              and terminal_attempt.status in ('sent', 'permanent_failure')
          )
          and not exists (
            select 1
            from public.notification_delivery_attempts active_attempt
            where active_attempt.outbox_id = outbox.id
              and active_attempt.subscription_id = subscription.id
              and active_attempt.status = 'processing'
          )
          and coalesce((
            select retry_attempt.next_retry_at <= input_now
            from public.notification_delivery_attempts retry_attempt
            where retry_attempt.outbox_id = outbox.id
              and retry_attempt.subscription_id = subscription.id
              and retry_attempt.status = 'retryable'
            order by retry_attempt.attempt_number desc
            limit 1
          ), true)
      )
    order by outbox.not_before, outbox.created_at, outbox.id
    limit input_limit
    for update skip locked
  loop
    for delivery in
      select subscription.*
      from public.push_subscriptions subscription
      where subscription.user_id = candidate.recipient_user_id
        and subscription.enabled
        and not exists (
          select 1
          from public.notification_delivery_attempts terminal_attempt
          where terminal_attempt.outbox_id = candidate.id
            and terminal_attempt.subscription_id = subscription.id
            and terminal_attempt.status in ('sent', 'permanent_failure')
        )
        and not exists (
          select 1
          from public.notification_delivery_attempts active_attempt
          where active_attempt.outbox_id = candidate.id
            and active_attempt.subscription_id = subscription.id
            and active_attempt.status = 'processing'
        )
        and coalesce((
          select retry_attempt.next_retry_at <= input_now
          from public.notification_delivery_attempts retry_attempt
          where retry_attempt.outbox_id = candidate.id
            and retry_attempt.subscription_id = subscription.id
            and retry_attempt.status = 'retryable'
          order by retry_attempt.attempt_number desc
          limit 1
        ), true)
      order by subscription.created_at, subscription.id
      for update skip locked
    loop
      exit when claimed_count >= input_limit;

      select coalesce(pg_catalog.max(attempt.attempt_number), 0) + 1
      into next_attempt_number
      from public.notification_delivery_attempts attempt
      where attempt.outbox_id = candidate.id
        and attempt.subscription_id = delivery.id;

      insert into public.notification_delivery_attempts (
        outbox_id,
        subscription_id,
        attempt_number,
        status,
        started_at
      )
      values (
        candidate.id,
        delivery.id,
        next_attempt_number,
        'processing',
        input_now
      )
      returning id into attempt_id;

      update public.notification_outbox
      set status = 'processing',
          attempt_count = attempt_count + 1,
          last_error = null
      where id = candidate.id;

      outbox_id := candidate.id;
      endpoint := delivery.endpoint;
      p256dh_key := delivery.p256dh_key;
      auth_key := delivery.auth_key;
      payload := private.build_notification_push_payload(candidate);
      claimed_count := claimed_count + 1;
      return next;
    end loop;

    exit when claimed_count >= input_limit;
  end loop;
end;
$$;

create function public.record_notification_delivery_result(
  input_attempt_id uuid,
  input_outcome text,
  input_response_status integer default null,
  input_error_code text default null,
  input_now timestamptz default pg_catalog.now(),
  input_retry_after_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_attempt public.notification_delivery_attempts;
  retry_delay_seconds integer;
  next_delivery_at timestamptz;
begin
  if input_attempt_id is null
    or input_outcome not in ('sent', 'retryable', 'permanent_failure')
    or input_now is null
    or (input_response_status is not null and input_response_status not between 100 and 599)
    or (input_error_code is not null and pg_catalog.char_length(input_error_code) not between 1 and 80)
    or (input_retry_after_seconds is not null and input_retry_after_seconds not between 0 and 86400) then
    raise exception using errcode = '22023', message = 'invalid notification delivery result';
  end if;

  select attempt.*
  into target_attempt
  from public.notification_delivery_attempts attempt
  where attempt.id = input_attempt_id
  for update;

  if target_attempt.id is null then
    raise exception using errcode = '22023', message = 'notification delivery attempt was not found';
  end if;

  -- Result recording is idempotent so a worker retry after a lost response does
  -- not mutate a terminal attempt or disable another subscription.
  if target_attempt.status <> 'processing' then
    return;
  end if;

  if input_outcome = 'sent' then
    update public.notification_delivery_attempts
    set status = 'sent',
        response_status = input_response_status,
        error_code = null,
        completed_at = input_now
    where id = target_attempt.id;

    update public.push_subscriptions
    set last_success_at = input_now,
        last_failure_at = null
    where id = target_attempt.subscription_id;
  elsif input_outcome = 'retryable' then
    retry_delay_seconds := case
      when input_retry_after_seconds is not null
        then least(3600, greatest(30, input_retry_after_seconds))
      else least(
        3600,
        (30 * pg_catalog.power(2::numeric, least(target_attempt.attempt_number - 1, 7)))::integer
      )
    end;
    next_delivery_at := input_now + pg_catalog.make_interval(secs => retry_delay_seconds);

    update public.notification_delivery_attempts
    set status = 'retryable',
        response_status = input_response_status,
        error_code = coalesce(input_error_code, 'transient_push_failure'),
        completed_at = input_now,
        next_retry_at = next_delivery_at
    where id = target_attempt.id;

    update public.push_subscriptions
    set last_failure_at = input_now
    where id = target_attempt.subscription_id;
  else
    update public.notification_delivery_attempts
    set status = 'permanent_failure',
        response_status = input_response_status,
        error_code = coalesce(input_error_code, 'permanent_push_failure'),
        completed_at = input_now
    where id = target_attempt.id;

    update public.push_subscriptions
    set last_failure_at = input_now,
        enabled = case when input_response_status in (404, 410) then false else enabled end,
        disabled_at = case when input_response_status in (404, 410) then input_now else disabled_at end
    where id = target_attempt.subscription_id;
  end if;

  if exists (
    select 1 from public.notification_delivery_attempts attempt
    where attempt.outbox_id = target_attempt.outbox_id and attempt.status = 'processing'
  ) then
    update public.notification_outbox set status = 'processing'
    where id = target_attempt.outbox_id;
  elsif exists (
    select 1
    from public.push_subscriptions subscription
    where subscription.user_id = (
      select outbox.recipient_user_id
      from public.notification_outbox outbox
      where outbox.id = target_attempt.outbox_id
    )
      and subscription.enabled
      and not exists (
        select 1
        from public.notification_delivery_attempts terminal_attempt
        where terminal_attempt.outbox_id = target_attempt.outbox_id
          and terminal_attempt.subscription_id = subscription.id
          and terminal_attempt.status in ('sent', 'permanent_failure')
      )
      and not exists (
        select 1
        from public.notification_delivery_attempts active_attempt
        where active_attempt.outbox_id = target_attempt.outbox_id
          and active_attempt.subscription_id = subscription.id
          and active_attempt.status = 'processing'
      )
  ) then
    select pg_catalog.min(attempt.next_retry_at)
    into next_delivery_at
    from public.notification_delivery_attempts attempt
    where attempt.outbox_id = target_attempt.outbox_id
      and attempt.status = 'retryable';

    update public.notification_outbox
    set status = 'pending',
        not_before = coalesce(next_delivery_at, input_now),
        last_error = case when input_outcome = 'retryable'
          then coalesce(input_error_code, 'transient_push_failure')
          else null
        end
    where id = target_attempt.outbox_id;
  elsif exists (
    select 1 from public.notification_delivery_attempts attempt
    where attempt.outbox_id = target_attempt.outbox_id and attempt.status = 'sent'
  ) then
    update public.notification_outbox
    set status = 'sent',
        sent_at = coalesce(sent_at, input_now),
        last_error = null
    where id = target_attempt.outbox_id;
  else
    update public.notification_outbox
    set status = 'failed',
        last_error = coalesce(input_error_code, 'all_push_deliveries_failed')
    where id = target_attempt.outbox_id;
  end if;
end;
$$;

revoke all on function private.notification_outbox_is_eligible(public.notification_outbox, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function private.build_notification_push_payload(public.notification_outbox)
from public, anon, authenticated, service_role;
revoke all on function public.claim_notification_deliveries(timestamptz, integer, integer)
from public, anon, authenticated;
revoke all on function public.record_notification_delivery_result(uuid, text, integer, text, timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(timestamptz, integer, integer)
to service_role;
grant execute on function public.record_notification_delivery_result(uuid, text, integer, text, timestamptz, integer)
to service_role;
