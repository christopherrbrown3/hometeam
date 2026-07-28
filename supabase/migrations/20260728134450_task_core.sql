create type public.task_series_type as enum (
  'one_time',
  'recurring'
);

create type public.task_recurrence_type as enum (
  'one_time',
  'calendar',
  'completion_interval'
);

create type public.task_assignment_mode as enum (
  'fixed',
  'unassigned',
  'round_robin'
);

create type public.task_missed_policy as enum (
  'keep_overdue',
  'skip_when_next_occurrence_begins',
  'keep_newest'
);

create type public.task_end_type as enum (
  'never',
  'on_date',
  'after_occurrences'
);

create type public.task_series_status as enum (
  'active',
  'paused',
  'deleted'
);

create type public.task_lifecycle_state as enum (
  'open',
  'completed',
  'skipped',
  'cancelled',
  'deleted'
);

create type public.task_assignment_source as enum (
  'fixed',
  'unassigned',
  'round_robin',
  'claimed',
  'manual'
);

create type public.task_event_type as enum (
  'series_created',
  'series_updated',
  'series_paused',
  'series_resumed',
  'series_deleted',
  'occurrence_generated',
  'occurrence_deleted',
  'assigned',
  'reassigned',
  'claimed',
  'completed',
  'completion_undone',
  'reopened',
  'snoozed',
  'snooze_changed',
  'skipped',
  'cancelled',
  'rotation_recalculated'
);

create table public.task_series (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null references public.households (id),
  title text not null,
  description text,
  category_id uuid,
  series_type public.task_series_type not null,
  recurrence_type public.task_recurrence_type not null,
  recurrence_config jsonb not null default '{}'::jsonb,
  assignment_mode public.task_assignment_mode not null default 'unassigned',
  fixed_assignee_id uuid references public.profiles (user_id),
  missed_policy public.task_missed_policy not null default 'keep_overdue',
  confirmation_required boolean not null default false,
  end_type public.task_end_type not null default 'never',
  end_at date,
  end_after_occurrences integer,
  series_status public.task_series_status not null default 'active',
  effective_from date not null,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  deleted_at timestamptz,
  constraint task_series_title_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(title)) between 1 and 200),
  constraint task_series_recurrence_config_is_object
    check (pg_catalog.jsonb_typeof(recurrence_config) = 'object'),
  constraint task_series_end_after_occurrences_is_positive
    check (end_after_occurrences is null or end_after_occurrences > 0),
  constraint task_series_end_date_not_before_effective_from
    check (end_at is null or end_at >= effective_from),
  constraint task_series_id_household_id_key unique (id, household_id)
);

create table public.task_schedule_slots (
  id uuid primary key default extensions.gen_random_uuid(),
  series_id uuid not null references public.task_series (id),
  local_start_time time,
  local_end_time time,
  end_day_offset smallint not null default 0,
  is_all_day boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint task_schedule_slots_all_day_has_no_times
    check (
      (is_all_day and local_start_time is null and local_end_time is null)
      or (not is_all_day and local_start_time is not null)
    ),
  constraint task_schedule_slots_end_day_offset_is_supported
    check (end_day_offset in (0, 1)),
  constraint task_schedule_slots_sort_order_is_nonnegative
    check (sort_order >= 0),
  constraint task_schedule_slots_series_sort_order_key unique (series_id, sort_order)
);

create table public.task_rotation_members (
  id uuid primary key default extensions.gen_random_uuid(),
  series_id uuid not null references public.task_series (id),
  user_id uuid not null references public.profiles (user_id),
  rotation_position integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint task_rotation_members_position_is_nonnegative
    check (rotation_position >= 0),
  constraint task_rotation_members_series_user_key unique (series_id, user_id)
);

create unique index task_rotation_members_one_active_position
  on public.task_rotation_members (series_id, rotation_position)
  where is_active;

create table public.task_occurrences (
  id uuid primary key default extensions.gen_random_uuid(),
  series_id uuid not null,
  household_id uuid not null,
  occurrence_key text not null,
  original_due_start timestamptz not null,
  original_due_end timestamptz not null,
  is_all_day boolean not null default false,
  lifecycle_state public.task_lifecycle_state not null default 'open',
  assignee_user_id uuid references public.profiles (user_id),
  assignment_source public.task_assignment_source not null default 'unassigned',
  assignment_locked boolean not null default false,
  completed_by uuid references public.profiles (user_id),
  completed_at timestamptz,
  skipped_by uuid references public.profiles (user_id),
  skipped_at timestamptz,
  skip_reason text,
  snoozed_by uuid references public.profiles (user_id),
  snoozed_until timestamptz,
  rotation_override boolean not null default false,
  version bigint not null default 1,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  deleted_at timestamptz,
  constraint task_occurrences_due_bounds_are_ordered
    check (original_due_end >= original_due_start),
  constraint task_occurrences_key_not_blank
    check (pg_catalog.char_length(pg_catalog.btrim(occurrence_key)) between 1 and 255),
  constraint task_occurrences_version_is_positive
    check (version > 0),
  constraint task_occurrences_series_household_fkey
    foreign key (series_id, household_id)
    references public.task_series (id, household_id),
  constraint task_occurrences_series_key unique (series_id, occurrence_key),
  constraint task_occurrences_id_series_household_key unique (id, series_id, household_id)
);

create table public.task_events (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null,
  series_id uuid not null,
  occurrence_id uuid,
  actor_user_id uuid references public.profiles (user_id),
  event_type public.task_event_type not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint task_events_payload_is_object
    check (pg_catalog.jsonb_typeof(event_payload) = 'object'),
  constraint task_events_series_household_fkey
    foreign key (series_id, household_id)
    references public.task_series (id, household_id),
  constraint task_events_occurrence_series_household_fkey
    foreign key (occurrence_id, series_id, household_id)
    references public.task_occurrences (id, series_id, household_id)
);

create trigger task_series_set_updated_at
before update on public.task_series
for each row
execute function public.set_updated_at();

create trigger task_rotation_members_set_updated_at
before update on public.task_rotation_members
for each row
execute function public.set_updated_at();

create trigger task_occurrences_set_updated_at
before update on public.task_occurrences
for each row
execute function public.set_updated_at();

alter table public.task_series enable row level security;
alter table public.task_series force row level security;
alter table public.task_schedule_slots enable row level security;
alter table public.task_schedule_slots force row level security;
alter table public.task_rotation_members enable row level security;
alter table public.task_rotation_members force row level security;
alter table public.task_occurrences enable row level security;
alter table public.task_occurrences force row level security;
alter table public.task_events enable row level security;
alter table public.task_events force row level security;

revoke all on table public.task_series from public, anon, authenticated;
revoke all on table public.task_schedule_slots from public, anon, authenticated;
revoke all on table public.task_rotation_members from public, anon, authenticated;
revoke all on table public.task_occurrences from public, anon, authenticated;
revoke all on table public.task_events from public, anon, authenticated;
