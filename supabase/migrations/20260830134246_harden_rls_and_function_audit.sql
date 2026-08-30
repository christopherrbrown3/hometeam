-- Issues #79 and #80: finish the release authorization matrix and make the
-- privileged database surface fail closed by default.

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
);

drop policy if exists memberships_own_or_full_member on public.household_memberships;
create policy memberships_own_or_full_member
on public.household_memberships
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and status = 'active'
    and removed_at is null
    and (select private.is_approved_user(auth.uid()))
  )
  or (select private.is_active_full_member(household_id, auth.uid()))
);

-- Assigned guests need the parent title/category used by the Today and
-- occurrence-detail projections, but no unrelated task definition. The
-- occurrence and active guest membership are both re-checked from stored rows.
drop policy if exists task_series_full_member on public.task_series;
create policy task_series_member_or_assigned_guest
on public.task_series
for select
to authenticated
using (
  deleted_at is null
  and (
    (select private.is_active_full_member(household_id, auth.uid()))
    or exists (
      select 1
      from public.task_occurrences occurrence
      join public.household_memberships membership
        on membership.household_id = occurrence.household_id
       and membership.user_id = (select auth.uid())
       and membership.role = 'guest'
       and membership.status = 'active'
       and membership.removed_at is null
      where occurrence.series_id = task_series.id
        and occurrence.household_id = task_series.household_id
        and occurrence.assignee_user_id = (select auth.uid())
        and occurrence.deleted_at is null
        and (select private.is_approved_user(auth.uid()))
    )
  )
);

drop policy if exists categories_full_member on public.categories;
create policy categories_member_or_assigned_guest
on public.categories
for select
to authenticated
using (
  archived_at is null
  and (
    (select private.is_active_full_member(household_id, auth.uid()))
    or exists (
      select 1
      from public.task_series series
      join public.task_occurrences occurrence
        on occurrence.series_id = series.id
       and occurrence.household_id = series.household_id
       and occurrence.assignee_user_id = (select auth.uid())
       and occurrence.deleted_at is null
      join public.household_memberships membership
        on membership.household_id = series.household_id
       and membership.user_id = (select auth.uid())
       and membership.role = 'guest'
       and membership.status = 'active'
       and membership.removed_at is null
      where series.category_id = categories.id
        and series.household_id = categories.household_id
        and series.deleted_at is null
        and (select private.is_approved_user(auth.uid()))
    )
  )
);

-- These validation/defaulting/guard triggers run inside already-authorized
-- writes and do not need to retain the function owner's privileges.
alter function private.validate_task_series_assignment() security invoker;
alter function private.validate_task_series_assignment() set search_path = '';
alter function private.ensure_notification_preferences() security invoker;
alter function private.ensure_notification_preferences() set search_path = '';
alter function private.reject_task_event_mutation() security invoker;
alter function private.reject_task_event_mutation() set search_path = '';

-- Trigger functions are not RPCs. Remove inherited execution even for the two
-- triggers that genuinely require definer rights (Auth bootstrap and the
-- deferred notification producer).
revoke all on function private.handle_new_auth_user()
from public, anon, authenticated, service_role;
revoke all on function private.validate_task_series_assignment()
from public, anon, authenticated, service_role;
revoke all on function private.ensure_notification_preferences()
from public, anon, authenticated, service_role;
revoke all on function private.reject_task_event_mutation()
from public, anon, authenticated, service_role;
revoke all on function private.enqueue_new_task_notification()
from public, anon, authenticated, service_role;

-- Event writes are available only through reviewed owner-executed writers and
-- RPCs; the service role must not gain a direct append or mutation path.
revoke all on table public.task_events from service_role;

-- PostgreSQL grants EXECUTE to PUBLIC for new functions unless the migration
-- owner changes its defaults. Future migrations must opt each browser or
-- service RPC into an explicit allowlist.
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;
