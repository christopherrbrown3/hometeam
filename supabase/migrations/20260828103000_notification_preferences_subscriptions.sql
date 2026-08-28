-- Issue #72: approved users manage only their own global notification settings
-- and per-device Web Push credentials. Delivery-only timestamps remain outside
-- browser write grants.

create function private.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row
execute function private.ensure_notification_preferences();

insert into public.notification_preferences (user_id)
select profile.user_id
from public.profiles profile
on conflict (user_id) do nothing;

create policy notification_preferences_owner_select
on public.notification_preferences
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
);

create policy notification_preferences_owner_insert
on public.notification_preferences
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
);

create policy notification_preferences_owner_update
on public.notification_preferences
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

create policy push_subscriptions_owner_select
on public.push_subscriptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
);

create policy push_subscriptions_owner_insert
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_approved_user(auth.uid()))
);

create policy push_subscriptions_owner_update
on public.push_subscriptions
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

grant select on table public.notification_preferences to authenticated;
grant insert (
  user_id,
  notify_assigned,
  notify_due_soon,
  notify_overdue,
  notify_completed,
  notify_skipped,
  notify_snoozed,
  notify_new_task,
  notify_membership_changes,
  due_soon_minutes,
  show_task_details
) on public.notification_preferences to authenticated;
grant update (
  user_id,
  notify_assigned,
  notify_due_soon,
  notify_overdue,
  notify_completed,
  notify_skipped,
  notify_snoozed,
  notify_new_task,
  notify_membership_changes,
  due_soon_minutes,
  show_task_details
) on public.notification_preferences to authenticated;

grant select on table public.push_subscriptions to authenticated;
grant insert (
  user_id,
  endpoint,
  p256dh_key,
  auth_key,
  device_label,
  enabled,
  disabled_at
) on public.push_subscriptions to authenticated;
grant update (
  user_id,
  endpoint,
  p256dh_key,
  auth_key,
  device_label,
  enabled,
  disabled_at
) on public.push_subscriptions to authenticated;

revoke all on function private.ensure_notification_preferences()
from public, anon, authenticated, service_role;
