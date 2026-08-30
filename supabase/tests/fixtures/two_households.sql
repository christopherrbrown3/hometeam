-- Canonical authorization actors and sentinel rows for the release RLS matrix.
-- The including test owns the surrounding transaction and rolls this fixture
-- back, so it remains repeatable and independent of execution order.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000104', 'outsider@example.test'),
  ('00000000-0000-0000-0000-000000000105', 'pending@example.test'),
  ('00000000-0000-0000-0000-000000000106', 'rejected@example.test'),
  ('00000000-0000-0000-0000-000000000107', 'suspended@example.test'),
  ('00000000-0000-0000-0000-000000000108', 'removed@example.test'),
  ('00000000-0000-0000-0000-000000000109', 'operator@example.test'),
  ('00000000-0000-0000-0000-000000000110', 'caregiver@example.test');

select private.bootstrap_platform_administrator(
  '00000000-0000-0000-0000-000000000109'
);

update public.platform_access
set status = 'approved',
    decided_at = timestamptz '2026-08-30 12:00:00+00',
    decided_by = '00000000-0000-0000-0000-000000000109'
where user_id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000108',
  '00000000-0000-0000-0000-000000000110'
);

update public.platform_access
set status = 'rejected',
    decided_at = timestamptz '2026-08-30 12:00:00+00',
    decided_by = '00000000-0000-0000-0000-000000000109'
where user_id = '00000000-0000-0000-0000-000000000106';

update public.platform_access
set status = 'suspended',
    decided_at = timestamptz '2026-08-30 12:00:00+00',
    decided_by = '00000000-0000-0000-0000-000000000109'
where user_id = '00000000-0000-0000-0000-000000000107';

insert into public.household_memberships (
  id,
  household_id,
  user_id,
  role,
  status,
  invited_by,
  joined_at,
  removed_at
) values
  (
    '00000000-0000-0000-0000-000000000310',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000110',
    'guest',
    'active',
    '00000000-0000-0000-0000-000000000102',
    timestamptz '2026-08-01 12:00:00+00',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000311',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000108',
    'full_member',
    'removed',
    '00000000-0000-0000-0000-000000000102',
    timestamptz '2026-08-01 12:00:00+00',
    timestamptz '2026-08-02 12:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000312',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000105',
    'full_member',
    'active',
    '00000000-0000-0000-0000-000000000102',
    timestamptz '2026-08-01 12:00:00+00',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000313',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000106',
    'full_member',
    'active',
    '00000000-0000-0000-0000-000000000102',
    timestamptz '2026-08-01 12:00:00+00',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000314',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000107',
    'full_member',
    'active',
    '00000000-0000-0000-0000-000000000102',
    timestamptz '2026-08-01 12:00:00+00',
    null
  );

insert into public.categories (id, household_id, name, color, created_by) values
  (
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000201',
    'Assigned guest sentinel',
    '#3355AA',
    '00000000-0000-0000-0000-000000000102'
  ),
  (
    '00000000-0000-0000-0000-000000000912',
    '00000000-0000-0000-0000-000000000201',
    'Household-only sentinel',
    '#228855',
    '00000000-0000-0000-0000-000000000102'
  ),
  (
    '00000000-0000-0000-0000-000000000913',
    '00000000-0000-0000-0000-000000000202',
    'Other household sentinel',
    '#884422',
    '00000000-0000-0000-0000-000000000103'
  );

insert into public.task_series (
  id,
  household_id,
  title,
  category_id,
  series_type,
  recurrence_type,
  recurrence_config,
  assignment_mode,
  fixed_assignee_id,
  effective_from,
  created_by
) values
  (
    '00000000-0000-0000-0000-000000000921',
    '00000000-0000-0000-0000-000000000201',
    'Assigned guest sentinel',
    '00000000-0000-0000-0000-000000000911',
    'one_time',
    'one_time',
    '{"version":1}',
    'fixed',
    '00000000-0000-0000-0000-000000000110',
    date '2026-09-01',
    '00000000-0000-0000-0000-000000000102'
  ),
  (
    '00000000-0000-0000-0000-000000000922',
    '00000000-0000-0000-0000-000000000201',
    'Household-only sentinel',
    '00000000-0000-0000-0000-000000000912',
    'recurring',
    'calendar',
    '{"version":1,"frequency":"daily"}',
    'round_robin',
    null,
    date '2026-09-01',
    '00000000-0000-0000-0000-000000000102'
  ),
  (
    '00000000-0000-0000-0000-000000000923',
    '00000000-0000-0000-0000-000000000202',
    'Other household sentinel',
    '00000000-0000-0000-0000-000000000913',
    'one_time',
    'one_time',
    '{"version":1}',
    'fixed',
    '00000000-0000-0000-0000-000000000103',
    date '2026-09-01',
    '00000000-0000-0000-0000-000000000103'
  );

insert into public.task_schedule_slots (
  id,
  series_id,
  local_start_time,
  local_end_time,
  sort_order
) values
  ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000921', time '09:00', time '09:15', 0),
  ('00000000-0000-0000-0000-000000000932', '00000000-0000-0000-0000-000000000922', time '10:00', time '10:15', 0),
  ('00000000-0000-0000-0000-000000000933', '00000000-0000-0000-0000-000000000923', time '11:00', time '11:15', 0);

insert into public.task_rotation_members (
  id,
  series_id,
  user_id,
  rotation_position
) values
  (
    '00000000-0000-0000-0000-000000000934',
    '00000000-0000-0000-0000-000000000922',
    '00000000-0000-0000-0000-000000000102',
    0
  );

insert into public.task_occurrences (
  id,
  series_id,
  household_id,
  occurrence_key,
  original_due_start,
  original_due_end,
  assignee_user_id,
  assignment_source
) values
  (
    '00000000-0000-0000-0000-000000000941',
    '00000000-0000-0000-0000-000000000921',
    '00000000-0000-0000-0000-000000000201',
    'rls-assigned-guest',
    timestamptz '2026-09-01 13:00:00+00',
    timestamptz '2026-09-01 13:15:00+00',
    '00000000-0000-0000-0000-000000000110',
    'fixed'
  ),
  (
    '00000000-0000-0000-0000-000000000942',
    '00000000-0000-0000-0000-000000000922',
    '00000000-0000-0000-0000-000000000201',
    'rls-household-only',
    timestamptz '2026-09-01 14:00:00+00',
    timestamptz '2026-09-01 14:15:00+00',
    '00000000-0000-0000-0000-000000000102',
    'round_robin'
  ),
  (
    '00000000-0000-0000-0000-000000000943',
    '00000000-0000-0000-0000-000000000923',
    '00000000-0000-0000-0000-000000000202',
    'rls-other-household',
    timestamptz '2026-09-01 15:00:00+00',
    timestamptz '2026-09-01 15:15:00+00',
    '00000000-0000-0000-0000-000000000103',
    'fixed'
  );

insert into public.push_subscriptions (
  id,
  user_id,
  endpoint,
  p256dh_key,
  auth_key,
  device_label
) values
  ('00000000-0000-0000-0000-000000000951', '00000000-0000-0000-0000-000000000102', 'https://push.example.test/102', 'p256dh-102', 'auth-102', 'Full member fixture'),
  ('00000000-0000-0000-0000-000000000952', '00000000-0000-0000-0000-000000000104', 'https://push.example.test/104', 'p256dh-104', 'auth-104', 'Outsider fixture'),
  ('00000000-0000-0000-0000-000000000953', '00000000-0000-0000-0000-000000000105', 'https://push.example.test/105', 'p256dh-105', 'auth-105', 'Pending fixture'),
  ('00000000-0000-0000-0000-000000000954', '00000000-0000-0000-0000-000000000106', 'https://push.example.test/106', 'p256dh-106', 'auth-106', 'Rejected fixture'),
  ('00000000-0000-0000-0000-000000000955', '00000000-0000-0000-0000-000000000107', 'https://push.example.test/107', 'p256dh-107', 'auth-107', 'Suspended fixture'),
  ('00000000-0000-0000-0000-000000000956', '00000000-0000-0000-0000-000000000108', 'https://push.example.test/108', 'p256dh-108', 'auth-108', 'Removed fixture'),
  ('00000000-0000-0000-0000-000000000957', '00000000-0000-0000-0000-000000000109', 'https://push.example.test/109', 'p256dh-109', 'auth-109', 'Administrator fixture'),
  ('00000000-0000-0000-0000-000000000958', '00000000-0000-0000-0000-000000000110', 'https://push.example.test/110', 'p256dh-110', 'auth-110', 'Guest fixture');
