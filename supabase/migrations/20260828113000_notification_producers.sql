-- Issue #74: lifecycle mutations and scheduled due-state scans produce durable,
-- privacy-minimal notification work through the issue #73 boundary.

create or replace function private.write_assignment_event(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_event_type public.task_event_type,
  input_before_assignee_id uuid,
  input_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.write_task_event(
    input_occurrence,
    input_actor_id,
    input_event_type,
    pg_catalog.jsonb_build_object(
      'reason', input_reason,
      'beforeAssigneeId', input_before_assignee_id,
      'afterAssigneeId', input_occurrence.assignee_user_id,
      'assignmentSource', input_occurrence.assignment_source,
      'assignmentLocked', input_occurrence.assignment_locked
    )
  );

  if input_reason <> 'assignment_lock_changed'
    and input_occurrence.assignee_user_id is not null
    and input_before_assignee_id is distinct from input_occurrence.assignee_user_id then
    perform private.enqueue_notifications(
      input_occurrence.id,
      input_actor_id,
      'assigned',
      'version:' || input_occurrence.version::text,
      pg_catalog.now()
    );
  end if;
end;
$$;

create function private.enqueue_new_task_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  first_occurrence public.task_occurrences;
begin
  select occurrence.*
  into first_occurrence
  from public.task_occurrences occurrence
  where occurrence.series_id = new.id
    and occurrence.lifecycle_state = 'open'
    and occurrence.deleted_at is null
  order by occurrence.original_due_start, occurrence.id
  limit 1;

  if first_occurrence.id is not null then
    perform private.enqueue_notifications(
      first_occurrence.id,
      new.created_by,
      'new_task',
      'series:' || new.id::text,
      pg_catalog.now()
    );
    if first_occurrence.assignee_user_id is not null then
      perform private.enqueue_notifications(
        first_occurrence.id,
        new.created_by,
        'assigned',
        'series:' || new.id::text,
        pg_catalog.now()
      );
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger task_series_enqueue_new_task
after insert on public.task_series
deferrable initially deferred
for each row
execute function private.enqueue_new_task_notification();

create function public.produce_scheduled_notifications(
  input_now timestamptz default pg_catalog.now(),
  input_limit integer default 200
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  candidate record;
  inserted_count integer := 0;
  due_notification_at timestamptz;
  lead_minutes integer;
begin
  if input_now is null or input_limit not between 1 and 500 then
    raise exception using errcode = '22023', message = 'a processing time and limit between 1 and 500 are required';
  end if;

  for candidate in
    select
      occurrence.*,
      household.timezone,
      coalesce(preference.due_soon_minutes, 30) as recipient_lead_minutes
    from public.task_occurrences occurrence
    join public.households household on household.id = occurrence.household_id
    left join public.notification_preferences preference
      on preference.user_id = occurrence.assignee_user_id
    where occurrence.lifecycle_state = 'open'
      and occurrence.deleted_at is null
      and (occurrence.snoozed_until is null or occurrence.snoozed_until <= input_now)
      and (
        occurrence.original_due_end < input_now
        or (
          occurrence.assignee_user_id is not null
          and occurrence.original_due_end >= input_now
          and case
            when occurrence.is_all_day then
              (((occurrence.original_due_start at time zone household.timezone)::date + time '09:00') at time zone household.timezone) <= input_now
            else occurrence.original_due_start - pg_catalog.make_interval(mins => coalesce(preference.due_soon_minutes, 30)) <= input_now
          end
        )
      )
    order by occurrence.original_due_end, occurrence.id
    limit input_limit
  loop
    lead_minutes := candidate.recipient_lead_minutes;
    due_notification_at := case
      when candidate.is_all_day then
        (((candidate.original_due_start at time zone candidate.timezone)::date + time '09:00') at time zone candidate.timezone)
      else candidate.original_due_start - pg_catalog.make_interval(mins => lead_minutes)
    end;

    if candidate.assignee_user_id is not null
      and candidate.original_due_end >= input_now
      and due_notification_at <= input_now then
      inserted_count := inserted_count + private.enqueue_notifications(
        candidate.id,
        null,
        'due_soon',
        'schedule:due-soon:' || extract(epoch from candidate.original_due_start)::bigint::text,
        due_notification_at
      );
    end if;

    if candidate.original_due_end < input_now then
      inserted_count := inserted_count + private.enqueue_notifications(
        candidate.id,
        null,
        'overdue',
        'schedule:overdue:' || extract(epoch from candidate.original_due_end)::bigint::text,
        candidate.original_due_end
      );
    end if;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.produce_scheduled_notifications(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.produce_scheduled_notifications(timestamptz, integer)
to service_role;

revoke all on function private.write_assignment_event(public.task_occurrences, uuid, public.task_event_type, uuid, text)
from public, anon, authenticated, service_role;
revoke all on function private.enqueue_new_task_notification()
from public, anon, authenticated, service_role;
