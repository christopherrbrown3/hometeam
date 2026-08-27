-- Issue #73: make notification recipient selection durable, private, and
-- idempotent before delivery workers are introduced.

create or replace function private.enqueue_notifications(
  input_occurrence_id uuid,
  input_actor_id uuid,
  input_type public.notification_type,
  input_source_key text,
  input_not_before timestamptz default pg_catalog.now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  request_actor_id uuid := auth.uid();
  target_occurrence public.task_occurrences;
  inserted_count integer := 0;
begin
  if input_occurrence_id is null
    or input_type is null
    or input_not_before is null
    or input_source_key is null
    or pg_catalog.char_length(pg_catalog.btrim(input_source_key)) not between 1 and 200 then
    raise exception using
      errcode = '22023',
      message = 'an occurrence, notification type, bounded source key, and delivery time are required';
  end if;

  if input_type = 'membership_changed'::public.notification_type then
    raise exception using
      errcode = '22023',
      message = 'membership notifications require a membership-scoped producer';
  end if;

  select occurrence.*
  into target_occurrence
  from public.task_occurrences occurrence
  where occurrence.id = input_occurrence_id;

  if target_occurrence.id is null or target_occurrence.deleted_at is not null then
    raise exception using
      errcode = '22023',
      message = 'an active target occurrence is required';
  end if;

  -- A browser-authenticated call may never forge or suppress the actor. Trusted
  -- scheduled jobs have no JWT actor and are still constrained by the private
  -- schema/function grants below.
  if request_actor_id is not null and request_actor_id is distinct from input_actor_id then
    raise exception using errcode = '42501', message = 'notification actor does not match the authenticated user';
  end if;

  if input_actor_id is not null
    and not private.is_active_member(target_occurrence.household_id, input_actor_id) then
    raise exception using errcode = '42501', message = 'notification actor lacks active household access';
  end if;

  with eligible_recipients as (
    select membership.user_id
    from public.household_memberships membership
    join public.platform_access access
      on access.user_id = membership.user_id
      and access.status = 'approved'
    left join public.notification_preferences preference
      on preference.user_id = membership.user_id
    where membership.household_id = target_occurrence.household_id
      and membership.status = 'active'
      and membership.removed_at is null
      and (input_actor_id is null or membership.user_id <> input_actor_id)
      and case input_type
        when 'assigned'::public.notification_type then
          target_occurrence.assignee_user_id is not null
          and membership.user_id = target_occurrence.assignee_user_id
        when 'due_soon'::public.notification_type then
          target_occurrence.assignee_user_id is not null
          and membership.user_id = target_occurrence.assignee_user_id
        when 'overdue'::public.notification_type then
          case
            when target_occurrence.assignee_user_id is not null
              then membership.user_id = target_occurrence.assignee_user_id
            else membership.role = 'full_member'
          end
        when 'completed'::public.notification_type then membership.role = 'full_member'
        when 'skipped'::public.notification_type then membership.role = 'full_member'
        when 'snoozed'::public.notification_type then membership.role = 'full_member'
        when 'new_task'::public.notification_type then membership.role = 'full_member'
        else false
      end
      and case input_type
        when 'assigned'::public.notification_type then coalesce(preference.notify_assigned, true)
        when 'due_soon'::public.notification_type then coalesce(preference.notify_due_soon, true)
        when 'overdue'::public.notification_type then coalesce(preference.notify_overdue, true)
        when 'completed'::public.notification_type then coalesce(preference.notify_completed, true)
        when 'skipped'::public.notification_type then coalesce(preference.notify_skipped, true)
        when 'snoozed'::public.notification_type then coalesce(preference.notify_snoozed, true)
        when 'new_task'::public.notification_type then coalesce(preference.notify_new_task, true)
        else false
      end
  )
  insert into public.notification_outbox (
    recipient_user_id,
    occurrence_id,
    notification_type,
    idempotency_key,
    payload,
    not_before
  )
  select
    recipient.user_id,
    target_occurrence.id,
    input_type,
    input_type::text || ':' || target_occurrence.id::text || ':' || recipient.user_id::text || ':' || pg_catalog.btrim(input_source_key),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'occurrenceId', target_occurrence.id,
      'notificationType', input_type::text
    ),
    input_not_before
  from eligible_recipients recipient
  on conflict (idempotency_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Preserve the lifecycle helper contract used by the existing transactional
-- RPCs while routing all recipient and key decisions through the authoritative
-- issue #73 implementation.
create or replace function private.enqueue_lifecycle_notification(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_type public.notification_type
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.enqueue_notifications(
    input_occurrence.id,
    input_actor_id,
    input_type,
    'version:' || input_occurrence.version::text,
    pg_catalog.now()
  );
end;
$$;

revoke all on function private.enqueue_notifications(uuid, uuid, public.notification_type, text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function private.enqueue_lifecycle_notification(public.task_occurrences, uuid, public.notification_type)
from public, anon, authenticated, service_role;
