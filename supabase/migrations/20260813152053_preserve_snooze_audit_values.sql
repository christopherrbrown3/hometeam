-- Preserve the value that was active before the update in snooze audit events.
create or replace function public.snooze_occurrence(input_occurrence_id uuid, input_expected_version bigint, input_snoozed_until timestamptz)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_occurrences;
  event_kind public.task_event_type;
  previous_snoozed_until timestamptz;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.can_mutate_occurrence_lifecycle(target, actor_id) then
    raise exception using errcode = '42501', message = 'guest_action_forbidden';
  end if;
  if target.version <> input_expected_version then
    raise exception using errcode = '40001', message = 'stale occurrence version';
  end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then
    raise exception using errcode = '22023', message = 'invalid occurrence state';
  end if;
  if input_snoozed_until <= pg_catalog.now() then
    raise exception using errcode = '22023', message = 'snooze expiration must be in the future';
  end if;

  previous_snoozed_until := target.snoozed_until;
  event_kind := case when previous_snoozed_until is null
    then 'snoozed'::public.task_event_type
    else 'snooze_changed'::public.task_event_type
  end;

  update public.task_occurrences
  set snoozed_by = actor_id,
      snoozed_until = input_snoozed_until,
      version = version + 1
  where id = target.id
  returning * into target;

  perform private.write_task_event(
    target,
    actor_id,
    event_kind,
    pg_catalog.jsonb_build_object(
      'previousSnoozedUntil', previous_snoozed_until,
      'snoozedUntil', input_snoozed_until
    )
  );
  perform private.enqueue_lifecycle_notification(target, actor_id, 'snoozed');
  return target;
end;
$$;
