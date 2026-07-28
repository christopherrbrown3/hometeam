# Assignment and rotation semantics

HomeTeam has three occurrence-assignment modes:

- **Fixed:** generation assigns the selected active household member.
- **Unassigned:** generation leaves the occurrence unassigned; any full member may claim it.
- **Round robin:** generation selects the next eligible ordered roster member. Guests may participate in a roster.

## Eligibility and cursor

An eligible roster member is both active in `task_rotation_members` and currently an active household member. Removed or temporarily inactive entries are skipped. The series cursor is the last confirmed lifecycle basis; it is not advanced merely because the scheduler created future rows. This keeps generation retries deterministic.

## Completion and recalculation

When lifecycle work records a completion, the actual eligible completer is normally the next cursor basis. Selecting **Keep the original rotation**, or completing by someone outside the roster, uses the original assignee instead. The resulting change recomputes only future rows that are open, automatic round-robin assignments, and unlocked.

Manual assignments, claims, fixed assignments, locked assignments, and completed, skipped, cancelled, or deleted rows are never changed by a recalculation. A preserved eligible manual/locked assignment becomes the basis for the next automatic row. Each database recalculation appends one `rotation_recalculated` event with a versioned payload and an event for each changed assignment.

## Authorization and concurrency

Only active full members may claim, manually assign, lock, reorder a roster, or request recalculation. Assignment RPCs derive the actor and household from the locked occurrence, require `expected_version`, and increment it once. A stale contender must refetch rather than retry silently. Guests may appear in a roster but cannot manage one.
