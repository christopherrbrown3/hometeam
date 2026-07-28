create type public.notification_type as enum (
  'assigned',
  'due_soon',
  'overdue',
  'completed',
  'skipped',
  'snoozed',
  'new_task',
  'membership_changed'
);

create type public.notification_outbox_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (user_id),
  notify_assigned boolean not null default true,
  notify_due_soon boolean not null default true,
  notify_overdue boolean not null default true,
  notify_completed boolean not null default true,
  notify_skipped boolean not null default true,
  notify_snoozed boolean not null default true,
  notify_new_task boolean not null default true,
  notify_membership_changes boolean not null default true,
  due_soon_minutes integer not null default 30,
  show_task_details boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint notification_preferences_due_soon_minutes_in_range
    check (due_soon_minutes between 1 and 1440)
);

create table public.push_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id),
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  device_label text,
  enabled boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  disabled_at timestamptz,
  constraint push_subscriptions_endpoint_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(endpoint)) between 1 and 4096),
  constraint push_subscriptions_p256dh_key_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(p256dh_key)) between 1 and 1024),
  constraint push_subscriptions_auth_key_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(auth_key)) between 1 and 1024),
  constraint push_subscriptions_device_label_is_bounded
    check (device_label is null or pg_catalog.char_length(pg_catalog.btrim(device_label)) between 1 and 120),
  constraint push_subscriptions_enabled_matches_disabled_at
    check ((enabled and disabled_at is null) or (not enabled and disabled_at is not null)),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create table public.notification_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles (user_id),
  occurrence_id uuid references public.task_occurrences (id),
  notification_type public.notification_type not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  not_before timestamptz not null default pg_catalog.now(),
  status public.notification_outbox_status not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default pg_catalog.now(),
  sent_at timestamptz,
  constraint notification_outbox_idempotency_key_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(idempotency_key)) between 1 and 512),
  constraint notification_outbox_payload_is_object
    check (pg_catalog.jsonb_typeof(payload) = 'object'),
  constraint notification_outbox_attempt_count_is_nonnegative
    check (attempt_count >= 0),
  constraint notification_outbox_last_error_is_bounded
    check (last_error is null or pg_catalog.char_length(last_error) <= 1000),
  constraint notification_outbox_idempotency_key_key unique (idempotency_key)
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.notification_outbox enable row level security;
alter table public.notification_outbox force row level security;

revoke all on table public.notification_preferences from public, anon, authenticated;
revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.notification_outbox from public, anon, authenticated;
