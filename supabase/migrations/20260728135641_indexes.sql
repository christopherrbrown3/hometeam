create index household_memberships_active_user_lookup
  on public.household_memberships (user_id, household_id)
  where status = 'active';

create index task_occurrences_open_household_due_lookup
  on public.task_occurrences (household_id, original_due_start)
  where lifecycle_state = 'open' and deleted_at is null;

create index task_occurrences_open_assignee_due_lookup
  on public.task_occurrences (assignee_user_id, original_due_start)
  where lifecycle_state = 'open'
    and deleted_at is null
    and assignee_user_id is not null;

create index task_occurrences_series_due_lookup
  on public.task_occurrences (series_id, original_due_start)
  where deleted_at is null;

create index task_events_household_history_lookup
  on public.task_events (household_id, created_at desc);

create index notification_outbox_pending_processing_lookup
  on public.notification_outbox (not_before, created_at)
  where status = 'pending';

create index push_subscriptions_active_user_lookup
  on public.push_subscriptions (user_id)
  where enabled;
