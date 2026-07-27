# HomeTeam Architecture Decisions

This log records minor implementation defaults selected within the product specification. A material contradiction requires a `needs:decision` issue and must not be silently changed by an implementation pull request.

## D-001 — GitHub owner override

- **Decision:** Use `christopherrbrown3` as the repository and Project owner.
- **Reason:** Christopher explicitly overrode the earlier `christopherrbrown` references after authentication showed `christopherrbrown3`.
- **Consequences:** The canonical remote is `https://github.com/christopherrbrown3/hometeam`. Repository-local commits use `Christopher Brown` and the authenticated account-specific no-reply address.

## D-002 — Planning baseline contains no application scaffold

- **Decision:** The first commit contains product, architecture, security, test, dependency, and workflow planning only.
- **Reason:** The planning-first brief explicitly stops before application implementation.

## D-003 — GitHub Pages routing

- **Decision:** Use React Router hash routing.
- **Reason:** It is reliable for repository-root, subpath, and custom-domain Pages deployments without server rewrites.

## D-004 — Time representation and DST

- **Decision:** Store instants in UTC; retain IANA household timezone and versioned local recurrence rules. Use `date-fns` plus `date-fns-tz` behind a domain adapter.
- **DST defaults:** Nonexistent local times move forward to the first valid instant; repeated local times choose the earlier offset. The generator records the resolution in event metadata.
- **Reason:** Deterministic behavior is required across devices and travel.

## D-005 — Recurrence configuration

- **Decision:** Normalize daily slots in `task_schedule_slots` and keep a versioned, validated JSONB rule in `task_series.recurrence_config`.
- **Version 1 shape:**

```json
{
  "version": 1,
  "kind": "calendar",
  "frequency": "daily",
  "weekdays": [1, 3, 5],
  "interval": 1
}
```

Completion interval:

```json
{
  "version": 1,
  "kind": "completion_interval",
  "amount": 8,
  "unit": "hour"
}
```

- **Validation:** Reject unknown versions, invalid weekday values, zero/negative intervals, incompatible slots, and end conditions that precede the effective date.

## D-006 — Occurrence uniqueness

- **Decision:** Enforce `UNIQUE(series_id, occurrence_key)` with deterministic calendar, one-time, and predecessor-based interval keys.
- **Reason:** Safe retries and concurrent generators must not create duplicate occurrences.

## D-007 — Generation horizon and scheduler

- **Decision:** Maintain approximately 30 days of calendar occurrences with a scheduled processor invoked once per minute. Process bounded batches using locks and cursors.
- **Reason:** Meets notification precision and normal-family scale within free-tier constraints.

## D-008 — First-update-wins contract

- **Decision:** All state-changing occurrence RPCs require `expected_version`, lock the row, validate the version/state/authorization, and increment version once.
- **Retry:** A client must refetch after conflict; it may not silently replay the mutation.

## D-009 — Undo and reopen

- **Decision:** Undo is allowed for 30 seconds from `completed_at`. Full members may undo any household completion during that period; a guest may undo only their own completion. Afterward, only full members may explicitly reopen.
- **Reason:** Matches the guest restriction and keeps shared task state recoverable.

## D-010 — Rotation completion basis

- **Decision:** Actual completer advances the rotation when active in the roster, unless `keep_original_rotation` is selected. Otherwise original assignee is the basis. Future unlocked automatic assignments are recalculated; closed or locked rows never change.

## D-011 — Event payloads

- **Decision:** `task_events.event_payload` is versioned JSONB with the minimum facts needed for audit. It must not contain invitation tokens, push keys, or secret values.

## D-012 — Notification idempotency

- **Decision:** Use semantic keys such as `<type>:<occurrence-id>:<recipient-id>:<schedule-version-or-event-id>`. A unique database constraint is the final duplicate defense.

## D-013 — Web Push implementation selection

- **Decision:** Do not preselect a package. A High Intelligence compatibility spike must validate a standards-based implementation in the then-current Supabase Deno runtime and commit the decision before delivery code begins.

## D-014 — Offline writes

- **Decision:** Cache only the app shell and safe recent reads. Do not queue or replay task mutations. All lifecycle controls are disabled offline with a concise explanation.

## D-015 — Soft deletion

- **Decision:** Normal application flows never hard-delete households, categories, series, occurrences, or audit events. Deleting a category leaves tasks uncategorized. Series deletion closes future open occurrences while preserving closed history.

## D-016 — Realtime payload handling

- **Decision:** Treat change payloads only as query invalidation hints; refetch the authorized authoritative projection before presenting state.

## D-017 — Multi-household Today date

- **Decision:** Each occurrence is classified using its household timezone. The selected Today calendar date is interpreted separately per household; the UI displays a timezone label when the device zone differs.

## D-018 — Sensitive notification disclaimer

- **Decision:** README and settings state that HomeTeam notifications are coordination aids, not the sole medically reliable reminder system.
