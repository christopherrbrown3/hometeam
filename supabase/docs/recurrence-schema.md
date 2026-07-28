# Recurrence schema contract

Milestone 4 stores recurrence definition separately from concrete occurrences. The
database accepts only version `1` JSON and is authoritative; the browser schema
exists to give a fast, accessible validation message before the same request is
sent to `save_task_series`.

## Series contracts

| Series / recurrence type | `recurrence_config` |
| --- | --- |
| `one_time` / `one_time` | `{ "version": 1 }` |
| `recurring` / `calendar` daily | `{ "version": 1, "frequency": "daily" }` |
| `recurring` / `calendar` weekly | `{ "version": 1, "frequency": "weekly", "weekdays": [1, 3, 5] }` |
| `recurring` / `completion_interval` | `{ "version": 1, "intervalMinutes": 480 }` |

Weekdays use JavaScript/PostgreSQL numbering: Sunday is `0`, Saturday is `6`.
Schedule slots are normalized in `task_schedule_slots`, ordered by `sort_order`.
An exact-time slot has `local_start_time` and optional `local_end_time`; a flexible
window uses both. An all-day slot has neither time and its due end is the next
household-local midnight. An end can cross midnight only with `end_day_offset: 1`.

## Timezone and key contract

Generation iterates *local household dates*, then resolves each slot using the
household's IANA timezone. A nonexistent wall time advances to the first valid
minute; a repeated wall time picks its earlier UTC instant. This is identical to
the TypeScript resolver's behavior and is covered by New York DST fixtures.

Calendar keys are:

```text
YYYY-MM-DD|start-end-or-all-day|end-day-offset|slot-sort-order
```

`UNIQUE(series_id, occurrence_key)` makes retries and overlapping scheduler calls
safe. Never derive the key from a viewer's device timezone.

## Controlled operations

`save_task_series(jsonb)`, `pause_task_series(uuid)`, and
`resume_task_series(uuid)` require approved, active full membership for the target
household. Direct task-table writes remain unavailable to browser roles.
`generate_calendar_occurrences(date, date)` and `apply_missed_policies(timestamptz)`
are scheduler-only database functions: they are intentionally not granted to
browser roles. The scheduled processor supplies a bounded date horizon.

Editing a series currently changes its definition and future generation input; the
per-occurrence, future-only, and whole-series edit scopes that preserve history are
implemented as lifecycle work in Milestone 6.
