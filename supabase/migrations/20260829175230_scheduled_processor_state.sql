-- Issue #76: one durable lease/cursor coordinates generation, missed-policy
-- evaluation, notification production, and retry delivery across cron runs.

create table private.scheduled_processor_state (
  job_name text primary key,
  run_token uuid,
  lease_until timestamptz,
  generation_through date,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint scheduled_processor_job_name_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(job_name)) between 1 and 80),
  constraint scheduled_processor_lease_is_consistent
    check ((run_token is null and lease_until is null) or (run_token is not null and lease_until is not null)),
  constraint scheduled_processor_error_is_bounded
    check (last_error is null or pg_catalog.char_length(last_error) between 1 and 200)
);

insert into private.scheduled_processor_state (job_name)
values ('notification_processor');

revoke all on table private.scheduled_processor_state
from public, anon, authenticated, service_role;

create function public.claim_scheduled_task_run(
  input_now timestamptz default pg_catalog.now(),
  input_lease_seconds integer default 120
)
returns table (
  acquired boolean,
  run_token uuid,
  generation_through date
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_state private.scheduled_processor_state;
  claimed_token uuid;
begin
  if input_now is null or input_lease_seconds not between 30 and 900 then
    raise exception using
      errcode = '22023',
      message = 'a processing time and lease between 30 and 900 seconds are required';
  end if;

  select state.*
  into target_state
  from private.scheduled_processor_state state
  where state.job_name = 'notification_processor'
  for update;

  if target_state.run_token is not null and target_state.lease_until > input_now then
    acquired := false;
    run_token := null;
    generation_through := target_state.generation_through;
    return next;
    return;
  end if;

  claimed_token := extensions.gen_random_uuid();
  update private.scheduled_processor_state
  set run_token = claimed_token,
      lease_until = input_now + pg_catalog.make_interval(secs => input_lease_seconds),
      last_started_at = input_now,
      last_error = null,
      updated_at = input_now
  where job_name = 'notification_processor';

  acquired := true;
  run_token := claimed_token;
  generation_through := target_state.generation_through;
  return next;
end;
$$;

create function public.complete_scheduled_task_run(
  input_run_token uuid,
  input_generation_through date default null,
  input_error text default null,
  input_now timestamptz default pg_catalog.now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  completed boolean;
begin
  if input_run_token is null
    or input_now is null
    or (input_error is not null and pg_catalog.char_length(input_error) not between 1 and 200) then
    raise exception using errcode = '22023', message = 'invalid scheduled processor completion';
  end if;

  update private.scheduled_processor_state
  set run_token = null,
      lease_until = null,
      generation_through = coalesce(input_generation_through, generation_through),
      last_completed_at = input_now,
      last_error = input_error,
      updated_at = input_now
  where job_name = 'notification_processor'
    and run_token = input_run_token;

  completed := found;
  return completed;
end;
$$;

revoke all on function public.claim_scheduled_task_run(timestamptz, integer)
from public, anon, authenticated;
revoke all on function public.complete_scheduled_task_run(uuid, date, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.claim_scheduled_task_run(timestamptz, integer)
to service_role;
grant execute on function public.complete_scheduled_task_run(uuid, date, text, timestamptz)
to service_role;

-- These existing functions were deliberately browser-inaccessible. The
-- scheduler is their first service-role caller, so grant only that role.
revoke all on function public.generate_calendar_occurrences(date, date)
from public, anon, authenticated;
revoke all on function public.apply_missed_policies(timestamptz)
from public, anon, authenticated;
grant execute on function public.generate_calendar_occurrences(date, date)
to service_role;
grant execute on function public.apply_missed_policies(timestamptz)
to service_role;
