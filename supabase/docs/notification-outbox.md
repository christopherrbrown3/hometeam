# Notification outbox contract

Issue #73 establishes the private database boundary for occurrence-scoped
notification work. Delivery, subscription management, and scheduled producers
remain separate downstream concerns.

## Producer contract

Trusted transactional code calls:

```sql
private.enqueue_notifications(
  input_occurrence_id uuid,
  input_actor_id uuid,
  input_type public.notification_type,
  input_source_key text,
  input_not_before timestamptz default now()
) returns integer
```

The function reloads the stored occurrence, derives its household, validates a
non-null actor's approved active membership, filters approved active recipients,
applies the global preference for the notification type, and inserts one outbox
row per recipient. The return value is the number of newly inserted rows; a
semantic replay returns zero.

Browser and API roles have no direct table access or function execution. When a
JWT actor exists, it must match `input_actor_id`. A null actor is reserved for a
trusted scheduled producer reached through a separately protected cron/service
boundary.

## Recipient matrix

| Type | Eligible recipients |
|---|---|
| `assigned` | The assignee, excluding the actor |
| `due_soon` | The assignee |
| `overdue` | The assignee, or all full members when unassigned |
| `completed`, `skipped`, `snoozed` | Other full household members |
| `new_task` | Other full household members |

Guests can therefore receive only assigned-occurrence work. Removed, suspended,
pending, rejected, unrelated, and cross-household users are excluded. A
`membership_changed` notification is rejected by this occurrence-scoped
function; its future producer must derive the household from the stored
membership target rather than accept an asserted household ID.

## Idempotency and privacy

The semantic database key is:

```text
<type>:<occurrence-id>:<recipient-id>:<source-key>
```

`source-key` is a bounded stable event, version, or schedule identity chosen by
the trusted producer. `ON CONFLICT DO NOTHING` against the unique outbox key is
the final concurrency defense.

The persisted payload contains only its schema version, occurrence ID, and
notification type. It does not contain task titles, descriptions, household
names, usernames, push endpoints, or encryption keys. The delivery worker must
revalidate access/preferences and apply the recipient's detail-privacy setting
immediately before sending.

## Existing lifecycle integration

`private.enqueue_lifecycle_notification` remains the compatibility boundary for
the existing complete, skip, and snooze transactions. It delegates to
`private.enqueue_notifications` with `version:<occurrence-version>` as the
source key so the state change, audit event, and notification work commit or
roll back together.

Database coverage in `supabase/tests/notification_outbox.test.sql` proves
preference suppression, actor exclusion, guest assignment isolation, platform
access revocation, cross-household denial, semantic replay, minimum payloads,
and the existing lifecycle side effect.
