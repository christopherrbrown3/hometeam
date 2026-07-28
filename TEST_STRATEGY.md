# HomeTeam Test Strategy

## 1. Purpose

Tests must demonstrate that shared task state, authorization, scheduling, rotation, notification work, and mobile behavior match `PRODUCT_SPEC.md`. Tests are delivered alongside each capability; the final quality milestone integrates and extends them rather than postponing all testing.

## 2. Test layers

### Unit tests

Vitest exercises pure TypeScript domain modules with table-driven fixtures. Mandatory areas: due-state derivation, recurrence, DST/timezone resolution, rotation, missed policies, snooze expiry, ordering, and filters. Fake clocks must use explicit UTC instants and household zones.

### Component tests

React Testing Library validates accessible behavior, not implementation details. Use a shared renderer with QueryClient, memory hash router, auth context, deterministic clock, and typed Supabase/RPC adapters. Cover loading, empty, error, offline, conflict, pending/rejected/suspended access, administrator, full-member, and guest states.

### Database and RLS tests

Use local Supabase SQL tests in transactions. Create actors through repeatable fixtures and set JWT claims per case. Test constraints, triggers, policy visibility, RPC authorization/state/version behavior, event/outbox side effects, and two-session races.

### Integration tests

Run the real local database, Auth-compatible sessions, generated client types, and Realtime where feasible. Verify query adapters and RPC error translation.

### End-to-end tests

Playwright uses separate browser contexts for a platform administrator, an unapproved applicant, two approved full members, and one approved guest. Email and Web Push delivery may be replaced with deterministic test adapters in CI, but approval, token validation, outbox creation, subscription code, and notification click routing remain real.

### PWA and deployment tests

Build under `/hometeam/` and `/`, inspect manifest/icon/service-worker paths and scope, verify hash-route refreshes, use Lighthouse/Playwright checks for installability, and assert no background mutation queue exists.

## 3. Fixture standards

Canonical actors: Admin (platform administrator), Pending User, Suspended User, Alex and Sam (approved full members), Grandma (approved guest), and an outsider. Use two households. Include overdue medicine, due-now dog feeding, snoozed cleaning, completed bedtime, unassigned recycling, fixed recurring, round-robin, flexible-window, and completion-interval examples. Never use real personal emails or sensitive medicine data.

Timezone fixtures include `America/New_York`, `America/Los_Angeles`, `Europe/London`, and a non-DST zone. Every date test names the household timezone and UTC instant.

## 4. Concurrency tests

Use two independent database sessions synchronized at a barrier:

1. both read occurrence version N;
2. both call the same or conflicting RPC;
3. exactly one commits;
4. the loser receives a typed conflict/current authoritative state;
5. one lifecycle event and one semantic notification set exist;
6. the occurrence version increments once.

Repeat for complete/complete, complete/skip, claim/claim, snooze/complete, undo/reopen, generation/generation, and duplicate outbox production.

## 5. Requirement traceability

| Requirement | Primary automated coverage | Owning issues |
|---|---|---|
| OTP, persistent session, intended route | Component + Playwright | #15–#18, #84 |
| Public preview requires administrator approval | RLS + component + Playwright | #96–#99, #79, #85, #90 |
| Administrator does not bypass household isolation | RLS + database negative tests | #97, #99, #79, #82 |
| Suspension/revocation purges Realtime and caches | Integration + multi-context E2E | #98, #99, #65, #67–#68 |
| Multiple households and switching | DB + component + E2E | #20, #21, #25, #84 |
| Invitation expiry/email/reuse | DB function + E2E | #22, #23, #25 |
| Guest assigned-only isolation | RLS + E2E | #26, #79, #84 |
| Category soft deletion | DB + component | #24, #61 |
| One-time and calendar recurrence | Unit + DB integration | #29–#33, #36 |
| Multiple times/flexible windows/all-day | Unit + DB integration | #30–#33, #36 |
| Completion intervals | DB function + unit | #32, #36, #48, #85 |
| DST and household timezone | Unit property/table tests | #31, #36 |
| Fixed/unassigned/claim | DB RPC + component | #40, #43 |
| Round robin and completing another turn | Unit + DB + E2E | #38–#44, #48, #85 |
| Keep-original-rotation override | Unit + DB + E2E | #38, #39, #41, #44, #48, #85 |
| First update wins | Two-session database + E2E | #46, #48–#54, #67, #85 |
| Snooze/skip/undo/reopen | DB + component + E2E | #49–#52, #58, #85 |
| Append-only history | Trigger/RLS + component | #47, #62, #80, #85 |
| Soft deletion and preserved history | DB + E2E | #52, #62, #85 |
| Today ordering and filters | Unit + component | #56, #57, #85 |
| Upcoming/Tasks/details/history | Component + E2E | #59–#62, #85 |
| Realtime and cache purge | Integration + multi-context E2E | #65–#68, #85 |
| Push preferences/subscriptions/outbox | RLS + function + mocked delivery | #72–#77, #86 |
| Notification idempotency/retry | DB + Edge Function tests | #73–#77, #86 |
| iPhone PWA/offline mutation blocking | Build + component + Playwright | #71, #77, #86, #89 |
| GitHub Pages subpath/custom domain | Build artifact + workflow test | #5, #89, #90 |
| Accessibility | axe + keyboard/component + manual checklist | #63, #85, #90 |
| No privileged secret in client/repo | bundle/repository scan | #81, #89, #90 |

## 6. Epic test ownership

Each epic has explicit child ownership:

- Repository/tooling: #4–#6
- Database foundation: #13
- Authentication: #18
- Preview access administration: #99
- Households/invitations: #25–#26
- Recurrence: #36
- Assignment/rotation: #44
- Lifecycle/audit: #54
- Main interface: #63
- Realtime: #68
- PWA/notifications: #77
- Security hardening: #79–#82
- Release quality: #84–#86
- Deployment readiness: #89–#90

## 7. CI gates

Every pull request runs formatting/checks, lint, strict typecheck, unit/component tests, relevant SQL tests, and production build. Database/RLS changes require local Supabase tests. UI changes require component tests and screenshots. Release candidates additionally run the full Playwright suite, PWA checks, migration replay from empty state, and secret scan.

Flaky tests are failures to fix, not rerun policies. Time-dependent tests use deterministic clocks. External email/push delivery is clearly separated from CI-safe contract testing.

## 8. Manual validation

Manual work supplements rather than replaces automation:

- real iPhone Home Screen install, safe-area layout, permission prompt, push receipt/click;
- VoiceOver and keyboard dialog/navigation pass;
- Supabase production email template/link settings;
- initial platform administrator UUID bootstrap and approval workflow;
- free-tier scheduled job timing and delivery monitoring;
- GitHub Pages repository subpath and optional custom domain.

Manual results are recorded in the release issue with device/browser versions and evidence.

## 9. Milestone 3 evidence

`supabase/tests/milestone_3_rls.test.sql` and
`supabase/tests/platform_access_rls.test.sql` provide deterministic local coverage
for pending/approved/suspended access, non-administrator decision denial, direct
table-write denial, administrator non-bypass, household isolation, guest assigned-only
occurrences, and approval-gated household/invitation RPCs. `AccessGate.test.tsx`
asserts that an unapproved session cannot mount product routes and that protected
query data is cleared. `e2e/households.spec.ts` verifies unauthenticated visitors
cannot reach household management. The production administrator bootstrap and real
email delivery remain manual, credential-bound validation steps.
