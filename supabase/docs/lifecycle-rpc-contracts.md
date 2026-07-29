# Lifecycle RPC contracts

Lifecycle changes are online-only, authenticated RPCs. The caller supplies an occurrence ID and its last read `expected_version`; the database derives the actor and household, locks the occurrence, authorizes the action, and increments the version exactly once on success. A client must refetch after `stale_version` and must never silently replay the action.

| RPC | Inputs | Allowed actor | Success effect |
| --- | --- | --- | --- |
| `complete_occurrence` | `occurrence_id`, `expected_version`, `keep_original_rotation` | Full member; assigned guest | Completes, appends an event, advances eligible rotation, creates an interval successor, enqueues notifications. |
| `snooze_occurrence` | `occurrence_id`, `expected_version`, future `snoozed_until` | Full member; assigned guest | Preserves due time and records a shared snooze event. |
| `skip_occurrence` | `occurrence_id`, `expected_version`, optional short reason | Full member; assigned guest | Skips and, for an interval series, creates the successor. |
| `cancel_occurrence` | `occurrence_id`, `expected_version`, optional reason | Full member | Cancels one open occurrence. |
| `undo_completion` | `occurrence_id`, `expected_version` | Full member; the assigned guest who completed it, within 30 seconds | Reopens, appends a compensating event, cancels the interval successor, and repairs rotation. |
| `reopen_occurrence` | `occurrence_id`, `expected_version` | Full member | Reopens a completed task after the undo window with the same repair behavior. |

`edit_task_series(series_id, patch, scope, effective_from)` accepts `only_this`, `this_and_future`, or `entire_series`; it never rewrites closed history. `pause_task_series`, `resume_task_series`, and `delete_task_series` are full-member-only. Deletion is soft: the series is marked deleted and only future open occurrences are marked deleted.

The TypeScript boundary returns `MutationResult<T>` with one of `access_denied`, `guest_action_forbidden`, `stale_version`, `already_completed`, `already_skipped`, `invalid_state`, or `undo_window_expired`. SQL errors remain internal transport details.
