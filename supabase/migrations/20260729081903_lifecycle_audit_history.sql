-- Milestone 6: lifecycle writes are authoritative, append-only transactions.
-- Client roles can read their scoped history but never alter it directly.

create function private.reject_task_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  raise exception using errcode = '42501', message = 'task events are append-only';
end;
$$;

create trigger task_events_reject_mutation
before update or delete on public.task_events
for each row execute function private.reject_task_event_mutation();

create policy events_assigned_guest_read
on public.task_events
for select to authenticated
using (
  occurrence_id is not null
  and exists (
    select 1
    from public.task_occurrences o
    join public.household_memberships m on m.household_id = o.household_id
    where o.id = task_events.occurrence_id
      and o.assignee_user_id = (select auth.uid())
      and m.user_id = (select auth.uid())
      and m.role = 'guest'
      and m.status = 'active'
      and m.removed_at is null
  )
);

create function private.write_task_event(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_event_type public.task_event_type,
  input_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if input_occurrence.id is null or input_actor_id is null or pg_catalog.jsonb_typeof(input_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'a target occurrence, actor, and object payload are required';
  end if;

  insert into public.task_events (household_id, series_id, occurrence_id, actor_user_id, event_type, event_payload)
  values (
    input_occurrence.household_id,
    input_occurrence.series_id,
    input_occurrence.id,
    input_actor_id,
    input_event_type,
    pg_catalog.jsonb_build_object('version', 1) || input_payload
  );
end;
$$;

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
end;
$$;

create function private.write_series_event(
  input_series public.task_series,
  input_actor_id uuid,
  input_event_type public.task_event_type,
  input_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if input_series.id is null or input_actor_id is null or pg_catalog.jsonb_typeof(input_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'a target series, actor, and object payload are required';
  end if;

  insert into public.task_events (household_id, series_id, actor_user_id, event_type, event_payload)
  values (input_series.household_id, input_series.id, input_actor_id, input_event_type, pg_catalog.jsonb_build_object('version', 1) || input_payload);
end;
$$;

create function private.can_mutate_occurrence_lifecycle(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_allow_guest boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select input_actor_id is not null and (
    private.is_active_full_member(input_occurrence.household_id, input_actor_id)
    or (
      input_allow_guest
      and input_occurrence.assignee_user_id = input_actor_id
      and exists (
        select 1
        from public.household_memberships m
        where m.household_id = input_occurrence.household_id
          and m.user_id = input_actor_id
          and m.role = 'guest'
          and m.status = 'active'
          and m.removed_at is null
      )
    )
  );
$$;

create function private.enqueue_lifecycle_notification(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_type public.notification_type
)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  insert into public.notification_outbox (recipient_user_id, occurrence_id, notification_type, idempotency_key, payload)
  select m.user_id,
    input_occurrence.id,
    input_type,
    'lifecycle:' || input_type::text || ':' || input_occurrence.id::text || ':' || input_occurrence.version::text || ':' || m.user_id::text,
    pg_catalog.jsonb_build_object('version', 1, 'occurrenceId', input_occurrence.id, 'eventType', input_type::text)
  from public.household_memberships m
  left join public.notification_preferences p on p.user_id = m.user_id
  where m.household_id = input_occurrence.household_id
    and m.status = 'active'
    and m.removed_at is null
    and m.user_id <> input_actor_id
    and case input_type
      when 'completed' then coalesce(p.notify_completed, true)
      when 'skipped' then coalesce(p.notify_skipped, true)
      when 'snoozed' then coalesce(p.notify_snoozed, true)
      else false
    end
  on conflict (idempotency_key) do nothing;
$$;

create function private.create_interval_successor(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_anchor timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_series public.task_series;
  successor public.task_occurrences;
  successor_start timestamptz;
  successor_assignee uuid;
  successor_source public.task_assignment_source;
begin
  select * into target_series from public.task_series where id = input_occurrence.series_id for update;
  if target_series.recurrence_type <> 'completion_interval'
    or not private.series_can_generate(target_series, (input_anchor at time zone (select h.timezone from public.households h where h.id = target_series.household_id))::date) then
    return;
  end if;

  successor_start := public.next_interval_successor(target_series.id, input_anchor);
  successor_assignee := case target_series.assignment_mode
    when 'fixed' then target_series.fixed_assignee_id
    when 'round_robin' then private.next_rotation_assignee(target_series.id, target_series.rotation_cursor_user_id)
    else null
  end;
  successor_source := case target_series.assignment_mode
    when 'fixed' then 'fixed'::public.task_assignment_source
    when 'round_robin' then 'round_robin'::public.task_assignment_source
    else 'unassigned'::public.task_assignment_source
  end;

  insert into public.task_occurrences (
    series_id, household_id, occurrence_key, original_due_start, original_due_end, is_all_day,
    assignee_user_id, assignment_source
  ) values (
    target_series.id,
    target_series.household_id,
    'interval:' || input_occurrence.id::text,
    successor_start,
    successor_start + (input_occurrence.original_due_end - input_occurrence.original_due_start),
    input_occurrence.is_all_day,
    successor_assignee,
    successor_source
  ) on conflict (series_id, occurrence_key) do nothing
  returning * into successor;

  if successor.id is not null then
    perform private.write_task_event(successor, input_actor_id, 'occurrence_generated', pg_catalog.jsonb_build_object('reason', 'completion_interval_successor', 'predecessorOccurrenceId', input_occurrence.id));
  end if;
end;
$$;

create function private.cancel_interval_successor(
  input_occurrence public.task_occurrences,
  input_actor_id uuid,
  input_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare successor public.task_occurrences;
begin
  select * into successor
  from public.task_occurrences
  where series_id = input_occurrence.series_id
    and occurrence_key = 'interval:' || input_occurrence.id::text
    and lifecycle_state = 'open'
  for update;
  if successor.id is not null then
    update public.task_occurrences set lifecycle_state = 'cancelled', version = version + 1 where id = successor.id returning * into successor;
    perform private.write_task_event(successor, input_actor_id, 'cancelled', pg_catalog.jsonb_build_object('reason', input_reason, 'predecessorOccurrenceId', input_occurrence.id));
  end if;
end;
$$;

create function private.repair_rotation_after_reopen(input_series_id uuid, input_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare basis uuid;
begin
  if not exists (select 1 from public.task_series where id = input_series_id and assignment_mode = 'round_robin') then return; end if;
  select nullif(e.event_payload->>'rotationBasisUserId', '')::uuid into basis
  from public.task_events e
  join public.task_occurrences o on o.id = e.occurrence_id
  where e.series_id = input_series_id and e.event_type = 'completed' and o.lifecycle_state = 'completed'
  order by e.created_at desc, e.id desc
  limit 1;
  perform private.recalculate_rotation_assignments(input_series_id, input_actor_id, basis, 'rotation_repaired');
end;
$$;

create function public.complete_occurrence(
  input_occurrence_id uuid,
  input_expected_version bigint,
  input_keep_original_rotation boolean default false
)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  target public.task_occurrences;
  target_series public.task_series;
  rotation_basis uuid;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.can_mutate_occurrence_lifecycle(target, actor_id) then
    raise exception using errcode = '42501', message = 'guest_action_forbidden';
  end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state = 'completed' then raise exception using errcode = '23505', message = 'already completed'; end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;

  select * into target_series from public.task_series where id = target.series_id for update;
  update public.task_occurrences
  set lifecycle_state = 'completed', completed_by = actor_id, completed_at = pg_catalog.now(), snoozed_by = null, snoozed_until = null,
      rotation_override = input_keep_original_rotation, version = version + 1
  where id = target.id returning * into target;

  rotation_basis := case
    when target_series.assignment_mode <> 'round_robin' then null
    when input_keep_original_rotation or not private.is_active_rotation_member(target.series_id, actor_id) then target.assignee_user_id
    else actor_id
  end;
  perform private.write_task_event(target, actor_id, 'completed', pg_catalog.jsonb_build_object(
    'previousState', 'open', 'originalAssigneeId', target.assignee_user_id, 'completedBy', actor_id,
    'rotationBasisUserId', rotation_basis, 'keepOriginalRotation', input_keep_original_rotation
  ));
  if target_series.assignment_mode = 'round_robin' and rotation_basis is not null then
    perform private.recalculate_rotation_assignments(target.series_id, actor_id, rotation_basis, 'completion');
  end if;
  perform private.create_interval_successor(target, actor_id, target.completed_at);
  perform private.enqueue_lifecycle_notification(target, actor_id, 'completed');
  return target;
end;
$$;

create function public.snooze_occurrence(input_occurrence_id uuid, input_expected_version bigint, input_snoozed_until timestamptz)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences; event_kind public.task_event_type;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.can_mutate_occurrence_lifecycle(target, actor_id) then raise exception using errcode = '42501', message = 'guest_action_forbidden'; end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;
  if input_snoozed_until <= pg_catalog.now() then raise exception using errcode = '22023', message = 'snooze expiration must be in the future'; end if;
  event_kind := case when target.snoozed_until is null then 'snoozed'::public.task_event_type else 'snooze_changed'::public.task_event_type end;
  update public.task_occurrences set snoozed_by = actor_id, snoozed_until = input_snoozed_until, version = version + 1 where id = target.id returning * into target;
  perform private.write_task_event(target, actor_id, event_kind, pg_catalog.jsonb_build_object('previousSnoozedUntil', target.snoozed_until, 'snoozedUntil', input_snoozed_until));
  perform private.enqueue_lifecycle_notification(target, actor_id, 'snoozed');
  return target;
end;
$$;

create function public.skip_occurrence(input_occurrence_id uuid, input_expected_version bigint, input_reason text default null)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.can_mutate_occurrence_lifecycle(target, actor_id) then raise exception using errcode = '42501', message = 'guest_action_forbidden'; end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state = 'skipped' then raise exception using errcode = '23505', message = 'already skipped'; end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;
  if input_reason is not null and pg_catalog.char_length(pg_catalog.btrim(input_reason)) > 280 then raise exception using errcode = '22023', message = 'skip reason is too long'; end if;
  update public.task_occurrences set lifecycle_state = 'skipped', skipped_by = actor_id, skipped_at = pg_catalog.now(), skip_reason = nullif(pg_catalog.btrim(input_reason), ''), snoozed_by = null, snoozed_until = null, version = version + 1 where id = target.id returning * into target;
  perform private.write_task_event(target, actor_id, 'skipped', pg_catalog.jsonb_build_object('previousState', 'open', 'originalAssigneeId', target.assignee_user_id, 'reason', target.skip_reason));
  perform private.create_interval_successor(target, actor_id, target.skipped_at);
  perform private.enqueue_lifecycle_notification(target, actor_id, 'skipped');
  return target;
end;
$$;

create function public.cancel_occurrence(input_occurrence_id uuid, input_expected_version bigint, input_reason text default null)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state <> 'open' or target.deleted_at is not null then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;
  update public.task_occurrences set lifecycle_state = 'cancelled', snoozed_by = null, snoozed_until = null, version = version + 1 where id = target.id returning * into target;
  perform private.write_task_event(target, actor_id, 'cancelled', pg_catalog.jsonb_build_object('previousState', 'open', 'reason', nullif(pg_catalog.btrim(input_reason), '')));
  return target;
end;
$$;

create function public.undo_completion(input_occurrence_id uuid, input_expected_version bigint)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences; is_full boolean;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  is_full := target.id is not null and private.is_active_full_member(target.household_id, actor_id);
  if target.id is null or actor_id is null or not (is_full or (private.can_mutate_occurrence_lifecycle(target, actor_id) and target.completed_by = actor_id)) then raise exception using errcode = '42501', message = 'guest_action_forbidden'; end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state <> 'completed' then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;
  if target.completed_at < pg_catalog.now() - interval '30 seconds' then raise exception using errcode = '22023', message = 'undo window expired'; end if;
  update public.task_occurrences set lifecycle_state = 'open', completed_by = null, completed_at = null, rotation_override = false, version = version + 1 where id = target.id returning * into target;
  perform private.write_task_event(target, actor_id, 'completion_undone', pg_catalog.jsonb_build_object('previousState', 'completed'));
  perform private.cancel_interval_successor(target, actor_id, 'completion_undone');
  perform private.repair_rotation_after_reopen(target.series_id, actor_id);
  return target;
end;
$$;

create function public.reopen_occurrence(input_occurrence_id uuid, input_expected_version bigint)
returns public.task_occurrences
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_occurrences;
begin
  select * into target from public.task_occurrences where id = input_occurrence_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.version <> input_expected_version then raise exception using errcode = '40001', message = 'stale occurrence version'; end if;
  if target.lifecycle_state <> 'completed' then raise exception using errcode = '22023', message = 'invalid occurrence state'; end if;
  update public.task_occurrences set lifecycle_state = 'open', completed_by = null, completed_at = null, rotation_override = false, version = version + 1 where id = target.id returning * into target;
  perform private.write_task_event(target, actor_id, 'reopened', pg_catalog.jsonb_build_object('previousState', 'completed'));
  perform private.cancel_interval_successor(target, actor_id, 'reopened');
  perform private.repair_rotation_after_reopen(target.series_id, actor_id);
  return target;
end;
$$;

create or replace function public.pause_task_series(input_series_id uuid)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.series_status <> 'active' then raise exception using errcode = '22023', message = 'only active series can be paused'; end if;
  update public.task_series set series_status = 'paused' where id = target.id returning * into target;
  perform private.write_series_event(target, actor_id, 'series_paused', pg_catalog.jsonb_build_object('previousStatus', 'active'));
  return target;
end;
$$;

create or replace function public.resume_task_series(input_series_id uuid)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.series_status <> 'paused' then raise exception using errcode = '22023', message = 'only paused series can be resumed'; end if;
  update public.task_series set series_status = 'active' where id = target.id returning * into target;
  perform private.write_series_event(target, actor_id, 'series_resumed', pg_catalog.jsonb_build_object('previousStatus', 'paused'));
  return target;
end;
$$;

create function public.edit_task_series(
  input_series_id uuid,
  input_patch jsonb,
  input_scope text default 'entire_series',
  input_effective_from timestamptz default pg_catalog.now()
)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series; affected integer := 0;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.series_status = 'deleted' or pg_catalog.jsonb_typeof(input_patch) <> 'object' or input_scope not in ('only_this', 'this_and_future', 'entire_series') then raise exception using errcode = '22023', message = 'invalid series edit'; end if;
  update public.task_series set
    title = case when input_patch ? 'title' then pg_catalog.btrim(input_patch->>'title') else title end,
    description = case when input_patch ? 'description' then nullif(pg_catalog.btrim(input_patch->>'description'), '') else description end,
    confirmation_required = case when input_patch ? 'confirmationRequired' then (input_patch->>'confirmationRequired')::boolean else confirmation_required end,
    missed_policy = case when input_patch ? 'missedPolicy' then (input_patch->>'missedPolicy')::public.task_missed_policy else missed_policy end
  where id = target.id returning * into target;
  if input_scope in ('only_this', 'this_and_future') then
    update public.task_occurrences
    set lifecycle_state = 'cancelled', version = version + 1
    where series_id = target.id and lifecycle_state = 'open' and original_due_start >= input_effective_from
      and (input_scope = 'this_and_future' or original_due_start = input_effective_from);
    get diagnostics affected = row_count;
  end if;
  perform private.write_series_event(target, actor_id, 'series_updated', pg_catalog.jsonb_build_object('scope', input_scope, 'effectiveFrom', input_effective_from, 'cancelledOpenOccurrences', affected));
  return target;
end;
$$;

create function public.delete_task_series(input_series_id uuid)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series; occurrence public.task_occurrences;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.series_status = 'deleted' then raise exception using errcode = '22023', message = 'series is already deleted'; end if;
  update public.task_series set series_status = 'deleted', deleted_at = pg_catalog.now() where id = target.id returning * into target;
  for occurrence in
    update public.task_occurrences set lifecycle_state = 'deleted', deleted_at = pg_catalog.now(), version = version + 1
    where series_id = target.id and lifecycle_state = 'open' and original_due_start >= pg_catalog.now()
    returning *
  loop
    perform private.write_task_event(occurrence, actor_id, 'occurrence_deleted', pg_catalog.jsonb_build_object('reason', 'series_deleted'));
  end loop;
  perform private.write_series_event(target, actor_id, 'series_deleted', pg_catalog.jsonb_build_object('softDeleted', true));
  return target;
end;
$$;

revoke all on table public.task_events from public, anon, authenticated;
grant select on table public.task_events to authenticated;
revoke all on function private.reject_task_event_mutation(), private.write_task_event(public.task_occurrences, uuid, public.task_event_type, jsonb), private.write_series_event(public.task_series, uuid, public.task_event_type, jsonb), private.can_mutate_occurrence_lifecycle(public.task_occurrences, uuid, boolean), private.enqueue_lifecycle_notification(public.task_occurrences, uuid, public.notification_type), private.create_interval_successor(public.task_occurrences, uuid, timestamptz), private.cancel_interval_successor(public.task_occurrences, uuid, text), private.repair_rotation_after_reopen(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_occurrence(uuid, bigint, boolean), public.snooze_occurrence(uuid, bigint, timestamptz), public.skip_occurrence(uuid, bigint, text), public.cancel_occurrence(uuid, bigint, text), public.undo_completion(uuid, bigint), public.reopen_occurrence(uuid, bigint), public.edit_task_series(uuid, jsonb, text, timestamptz), public.delete_task_series(uuid) from public, anon;
grant execute on function public.complete_occurrence(uuid, bigint, boolean), public.snooze_occurrence(uuid, bigint, timestamptz), public.skip_occurrence(uuid, bigint, text), public.cancel_occurrence(uuid, bigint, text), public.undo_completion(uuid, bigint), public.reopen_occurrence(uuid, bigint), public.edit_task_series(uuid, jsonb, text, timestamptz), public.delete_task_series(uuid) to authenticated;
