# Authorization and privileged-function audit

Issues #79 and #80 establish the release security evidence for the database
surface. The audit is executable; this document records the contract and how to
rerun it rather than duplicating the assertions by hand.

## RLS matrix

`supabase/tests/fixtures/two_households.sql` creates deterministic sentinels for
an approved full member, assigned guest, approved outsider, removed user,
pending user, rejected user, suspended user, platform administrator without a
household, and approved non-administrator. `supabase/tests/rls_matrix.test.sql`
then inventories every public table and verifies:

- RLS is enabled and forced on all public tables;
- anonymous callers have no table privileges;
- browser-readable tables expose only policy-filtered rows;
- invitation hashes, join-link hashes, platform internals, raw audit events,
  notification outbox work, and delivery attempts have no browser read grant;
- assigned guests can load only their occurrence and the minimum parent
  task/category projection used by Today;
- removed and inactive users cannot retain a membership signal or product row;
- administrator status exposes account-review metadata but never household
  data; and
- direct cross-household and unauthorized RPC attempts fail.

An approved account without a household can still own its global notification
preferences and device subscriptions. Those owner-only records are not
household data and remain protected by `user_id = auth.uid()`.

## Privileged-function audit

`supabase/tests/security_definer_audit.test.sql` inspects the live PostgreSQL
catalog instead of maintaining a second handwritten function inventory. It
requires every application function to have the migration-role owner and an
explicit safe `search_path`, and verifies the exact private RLS-helper and
service-only RPC allowlists.

Only the Auth bootstrap and deferred notification trigger retain
`SECURITY DEFINER` among trigger functions because they cross a real privilege
boundary. Validation, notification-defaulting, and append-only guard triggers
run as invokers. Trigger functions are not RPCs and have no API-role execution
grant. Default privileges also deny execution on future `public` and `private`
functions until a migration grants an explicit allowlist role.

`task_events` remains inaccessible directly to browser and service roles.
Controlled writers append events, `list_history` returns the authorized/redacted
projection, and the database trigger rejects both privileged UPDATE and DELETE.

## Verification

From the repository root with the local Supabase stack running:

```bash
npm run test:db
npx --yes supabase@2.110.0 db advisors --local --type security --level warn --fail-on warn
npx --yes supabase@2.110.0 db lint --local --level warning
```

Run `npm run check` as the repository-wide non-browser validation gate. The SQL
tests run in transactions and do not depend on order or wall-clock timing.
