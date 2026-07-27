# HomeTeam Security Model

## 1. Protected assets and security goals

Protected assets include platform access decisions, administrator identity, household identity, membership, invitations, task definitions, occurrences, descriptions, assignees, audit history, notification preferences, Web Push subscriptions, secrets, and deployment credentials.

Security goals:

- outsiders receive no household task data;
- authenticated but unapproved users receive no HomeTeam product data;
- platform administrators can manage preview access without implicit household visibility;
- guests receive only explicitly assigned occurrences and the minimum related data;
- removed members lose access immediately;
- lifecycle changes are authorized, atomic, and auditable;
- events remain append-only;
- cross-household identifiers never grant access;
- invitation and push credentials are not disclosed;
- privileged secrets never enter the browser, repository, Actions logs, or product audit records.

## 2. Trust boundaries

1. **Untrusted browser/PWA:** JavaScript, local storage, URLs, cached records, user input, and claimed IDs/versions are attacker-controlled.
2. **Supabase public API:** Accepts publishable-key requests with user JWTs; every exposed table has RLS.
3. **PostgreSQL privileged functions:** Security-definer RPCs may cross ordinary RLS only after explicit actor, membership, target, state, and version checks.
4. **Scheduled/notification Edge Functions:** Hold privileged secrets and accept only cron/service invocation.
5. **Push services:** Receive encrypted standards-based payloads and opaque endpoints.
6. **GitHub Actions/Pages:** Builds public static assets; must never receive backend service-role or VAPID private keys.

## 3. Authentication assumptions

Supabase Auth validates passwordless email OTPs and issues JWTs. Authentication alone does not authorize product access. Authorization first requires an `approved` `platform_access` row for `auth.uid()`, then applies household role/target checks. Email comparison is used only inside invitation acceptance after canonical normalization and authenticated lookup. Sessions are cleared on sign-out; protected query caches and Realtime channels are cleared on identity change, suspension, or approval revocation.

## 4. Permission matrix

### Platform access

| Capability | Platform administrator | Approved user | Pending/rejected/suspended user |
|---|---:|---:|---:|
| Read own access state | Yes | Yes | Yes |
| List pending access requests | Yes | No | No |
| Approve/reject/suspend/restore access | Yes | No | No |
| Access household data without membership | No | No | No |
| Proceed to household authorization | Only when also approved | Yes | No |

Platform administrator is an application-wide access-review role, not a household role.

### Household access

| Capability | Full member | Assigned guest | Unassigned/other guest | Outsider/removed |
|---|---:|---:|---:|---:|
| Read household identity | Yes | Minimal | Minimal own membership only | No |
| Read all series/occurrences | Yes | No | No | No |
| Read assigned occurrence + minimal series/category | Yes | Yes | No | No |
| Read full history | Yes | No | No | No |
| Mutate assigned occurrence lifecycle | Yes | Complete/snooze/skip; own Undo | No | No |
| Claim/reassign/manage series | Yes | No | No | No |
| Manage household/categories/members | Yes | No | No | No |
| Read own notification preferences/subscriptions | Yes | Yes | Yes | No |

Full members have equal authority inside an active household membership.

## 5. RLS policy strategy

Enable and force RLS on every exposed table. Revoke broad table privileges before granting the minimum `SELECT` needed for policy-filtered reads. Direct client writes are denied for lifecycle tables, events, rotations, invitations, memberships, and outbox unless a narrowly defined safe path is documented.

Stable helper functions:

```sql
private.is_active_full_member(target_household uuid, actor uuid)
private.is_active_guest(target_household uuid, actor uuid)
private.can_read_occurrence(target_occurrence uuid, actor uuid)
private.is_approved_user(actor uuid)
private.is_platform_administrator(actor uuid)
```

Helpers are non-user-overridable, explicitly schema-qualified, and do not accept a client-supplied household as sufficient proof. Every household/product helper first requires approved platform access, then joins the target record back to its stored household.

### Pending, rejected, and suspended users

May read only their own minimal profile and current platform access state. They cannot read memberships or invitations, accept invitations, create households, subscribe to product Realtime channels, manage push subscriptions, or call product RPCs.

### Platform administrators

May list minimum applicant identity/access metadata and execute controlled access-decision RPCs. Administrator status does not satisfy household membership predicates. The privileged initial bootstrap atomically creates the administrator, approves that same UUID, and records a bootstrap event; there is no client-callable bootstrap. Later access decisions use target user IDs from stored rows, lock the row, validate state transitions, and append `platform_access_events`; client roles cannot update/delete those events.

### Full members

May read household resources when an active full membership exists. Management operations occur through RPCs or tightly scoped policies. A membership in household A never authorizes a row in household B.

### Guests

May read:

- their active membership;
- minimal `households` identity for that membership;
- `task_occurrences` where `assignee_user_id = auth.uid()` and the membership is active;
- the parent `task_series` and optional category only through a guest-safe projection tied to a readable occurrence;
- `task_events` whose `occurrence_id` is currently or historically authorized for that guest and whose payload is safe.

Guests never receive roster, other assignees, household-wide categories, unassigned tasks, invitations, membership lists, or outbox records. Guest mutations are RPC-only and re-check current assignment under a row lock.

### Removed members

All policies require current active membership and `removed_at IS NULL`. Removal commits before the frontend receives success. Realtime authorization then fails; clients also unsubscribe and purge caches.

## 6. Security-definer function rules

Every security-definer function:

- sets `search_path = pg_catalog, public` or an equally explicit safe list;
- schema-qualifies referenced tables/functions;
- reads `auth.uid()` internally and rejects null;
- verifies approved platform access for every product operation, or platform-administrator status for an access-review operation;
- resolves household from the target row, not a trusted client parameter;
- checks active membership/role and guest-specific assignment;
- locks the target row before lifecycle/version decisions;
- validates expected state and version;
- writes events and notification work in the same transaction;
- grants EXECUTE only to intended roles;
- does not return fields the actor could not read under the output contract.

Dynamic SQL is prohibited unless unavoidable, fixed-format, and separately reviewed. Ownership belongs to a migration role that is not exposed to clients.

## 7. Cross-household isolation

All child tables carry or derive `household_id`; foreign keys prevent mismatched series/occurrence/event relationships. Functions re-derive household identity. Tests use two households and attempt direct reads, forged IDs, RPC calls, joins, Realtime access, and invitation reuse across them.

## 8. Invitation-token handling

Generate at least 256 bits of cryptographic randomness. Store only a cryptographic hash; compare hashes in constant-time-capable database operations. Tokens are single-use, time-limited, revocable, and bound to normalized invited email, household, and role. Never log raw tokens or include them in audit payloads. Resend revokes the previous token and creates a new expiry. Acceptance is transactional and protected by a uniqueness constraint on active membership.

## 9. Push-subscription protection

Endpoints and encryption keys are personal security data. Users can create/read/disable only their own subscriptions; no household member can browse another user’s endpoints. Delivery functions load keys under service privilege. Payloads honor the recipient’s privacy setting. HTTP 404/410 disables only the failing device subscription. Logs redact endpoints and keys.

## 10. Realtime authorization

Realtime tables use the same RLS predicates as REST reads. Guests must not subscribe to household-wide projections that expose other rows. The client scopes channels to active membership/assignee. Removing membership revokes future events; client cache purge handles already-fetched data on that device.

## 11. Append-only events

Authenticated/client roles have no UPDATE or DELETE on `task_events`. A trigger rejects mutation outside controlled maintenance. Events are inserted by RPCs or trusted jobs and contain actor, target, type, timestamp, and a versioned minimal payload. Undo/reopen/correction creates a new event.

## 12. Soft deletion

Policies exclude `deleted_at IS NOT NULL` records from normal management screens. History-safe projections expose the minimal deleted metadata needed by authorized full members and assigned guests. Soft deletion does not revoke the audit constraints or permit ID reuse.

## 13. Secrets and deployment

- Browser: only Supabase URL, publishable key, base path, and VAPID public key.
- Supabase secrets: service-role key, VAPID private key, and VAPID subject.
- GitHub: Pages deployment token/permissions only; no service-role or private VAPID value.
- Local development: ignored `.env.local`; committed `.env.example` contains names only.

CI uses least-privilege `contents: read`, `pages: write`, and `id-token: write` only for the deploy job. Secrets must not be echoed or passed as command-line arguments that appear in logs.

## 14. Logging and privacy

Operational logs default to IDs, result codes, counts, and correlation IDs. Do not log emails, invitation tokens, descriptions, task titles, household names, push endpoints/keys, OTPs, JWTs, or secret values. User-visible history is a product feature and follows authorization; it is not an unrestricted log sink.

## 15. Threats and mitigations

| Threat | Mitigation |
|---|---|
| IDOR/cross-household row access | RLS on every table, target-derived household checks, two-household negative tests |
| Public visitor authenticates and starts using preview | Approved platform-access predicate on all product reads, Realtime subscriptions, and RPCs |
| User forges administrator UI or RPC call | Administrator table checked from `auth.uid()` inside RLS/security-definer functions |
| Administrator gains household visibility | Separate predicates; administrator status never satisfies household membership |
| Suspended user keeps cached/live data | RLS revocation plus immediate Realtime teardown and protected cache purge |
| Guest enumerates unrelated tasks | Assignee-bound occurrence policies and guest-safe projections |
| Forged role/assignee/version | Derive actor from JWT; lock and validate stored membership/target/version |
| Double completion/race | Compare-and-swap under row lock; unique constraints; typed conflict |
| Duplicate occurrence/notification | Deterministic occurrence and idempotency keys with unique constraints |
| Event tampering | Revoke update/delete, append-only trigger, controlled inserts |
| Invitation theft/replay | High-entropy token, hash-only storage, expiry, email binding, single-use/revocation |
| Search-path hijack | Fixed safe `search_path`, schema-qualified SQL, reviewed ownership/grants |
| Secret leakage in frontend/CI | Environment separation, bundle scan, log redaction, least privilege |
| Offline replay changes shared state | No mutation queue/background sync; offline action guard |
| Removed member retains live data | Membership required in RLS, channel teardown, protected cache purge |
| Malicious push endpoint or payload leak | Owner-only subscription policies, payload privacy, URL/key redaction |
| Scheduler processes same work twice | Row locks/advisory lock, bounded claims, semantic idempotency |

## 16. Required security tests before release

- full member, guest, removed member, and outsider matrix for every exposed table;
- pending, rejected, suspended, approved, administrator, and non-administrator platform access matrix;
- unapproved user denied household creation, invitation acceptance, product tables, Realtime, mutations, and push-subscription management;
- administrator decision transitions and append-only access events;
- administrator without household membership denied household data;
- suspension/revocation tears down Realtime and clears protected client caches;
- guest assigned/unassigned/other-assignee reads and RPC calls;
- cross-household IDs supplied to every security-definer RPC;
- safe `search_path`, ownership, EXECUTE grants, and direct-table privilege audit;
- stale-version and concurrent completion races;
- duplicate occurrence and outbox insertion races;
- event update/delete rejection;
- invitation expiry, revocation, reuse, email mismatch, and concurrent acceptance;
- subscription owner isolation and invalid-device disabling;
- Realtime guest filtering and membership revocation;
- repository/bundle secret scan;
- soft-delete history visibility and normal-screen exclusion.

Release is blocked until P0/P1 security tests pass and the High Intelligence security review issue is accepted.
