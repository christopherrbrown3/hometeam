# PWA and notification foundation

Issues #71, #72, and #74 establish the install/offline boundary, user-owned
notification settings, per-device Web Push subscriptions, and the producers that
write durable notification work. Delivery and once-per-minute orchestration
remain owned by #75 and #76.

## PWA and offline contract

- `public/manifest.webmanifest` uses relative start, scope, and icon URLs so the
  same artifact works at a GitHub Pages subpath or custom domain.
- `src/features/pwa/service-worker.ts` precaches the app shell, handles
  privacy-minimal push payloads, opens `#/today?occurrence=<id>`, and accepts the
  explicit update prompt's `SKIP_WAITING` message.
- Offline state is announced globally. Complete, skip, snooze, assignment,
  task-save, pause/resume, and delete controls are disabled while offline.
  Mutation services call `requireOnline()` as a second boundary.
- No Background Sync or task-mutation replay is registered. Cached UI is for
  safe viewing only.

## Preference and device contract

Every profile has one `notification_preferences` row. Approved users can read
and update only their own row. Inputs are limited to the eight version 1 global
toggles, 5/15/30/60-minute due-soon lead times, and the task-detail privacy
choice.

Push subscriptions are stored per device. Approved users can read, register,
refresh, or disable only their own endpoints and keys. Browser roles cannot
write `last_success_at` or `last_failure_at`; delivery code owns those fields.
Disabling a row sets `enabled = false` and `disabled_at` together, without
changing another device. The client never logs or renders endpoints or keys.

The browser receives only `VITE_VAPID_PUBLIC_KEY`. VAPID private material and
service credentials remain Supabase secrets. On iPhone, the settings panel
guides installation first and calls `Notification.requestPermission()` only
from the user's **Enable notifications** action.

## Producer contract

Assignment, completion, skip, snooze, and new-task mutations enqueue outbox rows
inside their database transaction. A new task also produces an assignment event
for its first assigned occurrence when the creator is not the assignee. Actor exclusion, role rules, platform access,
guest assignment isolation, preferences, minimal payloads, and semantic
idempotency continue to be enforced by `private.enqueue_notifications`.

The service-role-only scheduled boundary is:

```sql
public.produce_scheduled_notifications(
  input_now timestamptz default now(),
  input_limit integer default 200
) returns integer
```

It scans at most 500 eligible open occurrences, suppresses active snoozes,
applies the assignee's due-soon lead time, uses 9:00 AM household time for
all-day due reminders, and produces overdue work after `original_due_end`.
Unassigned overdue work targets eligible full members. Repeated or concurrent
scans remain safe because the semantic outbox key is unique.

The function produces work only. #76 owns the advisory/claim locking,
generation/missed-policy ordering, retry orchestration, and per-run time budget.
