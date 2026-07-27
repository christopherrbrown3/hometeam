# HomeTeam Implementation Plan

## 1. Planning rules

This plan decomposes HomeTeam version 1 into 12 ordered milestones, 13 epics, and 77 atomic issues. Issue numbers are reserved in creation order in this document. Every atomic issue is intended for one focused branch and pull request. No application implementation is part of the planning baseline.

Model tiers:

- **High Intelligence:** unresolved or security-sensitive reasoning whose output freezes a contract.
- **Standard Implementation:** architecture and contracts are specified; implement and test them.
- **Mechanical or Documentation:** deterministic configuration, fixtures, or documentation work.

## 2. Milestones and exit criteria

| Milestone | Objective and capabilities | Testable exit criteria | Dependencies | Principal risks |
|---|---|---|---|---|
| 1. Repository and Tooling | Strict React/Vite foundation, routing, styles, tests, PWA/Pages workflow, contributor guardrails | clean install; lint/typecheck/unit/build workflows pass; subpath build works | None | Pages settings, version drift |
| 2. Supabase and Database Foundation | Local Supabase, core tables/enums/indexes, seed, generated types | migrations replay from empty state; constraints/index tests pass; seed loads | M1 | schema churn, migration order |
| 3. Authentication and Households | OTP, profiles, multi-household memberships, invitations, categories, guest foundations | two members and one guest authenticate/join; invitation and RLS tests pass | M2 | token/email handling, isolation |
| 4. Task and Recurrence Engine | task definitions, slots, recurrence, timezone, generation, missed policies, forms | all supported v1 schedules generate unique correct occurrences across DST | M2–M3 | DST, duplicate generation |
| 5. Assignment and Rotation | fixed/unassigned/claim/round-robin and future recalculation | rotation matrix and database tests pass without rewriting locked/history rows | M3–M4 | override/undo semantics |
| 6. Task Lifecycle and Audit History | atomic lifecycle RPCs, version conflicts, events, soft deletion | race tests prove first update wins; every action appends correct immutable events | M4–M5 | transactional complexity |
| 7. Main Application Interface | Today, Upcoming, Tasks, details, History, households/settings | primary mobile flows work for full member/guest with accessible states | M3–M6 | scope, mobile accessibility |
| 8. Realtime Synchronization | scoped channels, query invalidation, conflicts, revocation purge | two sessions synchronize; removed user loses channel/cache access | M3, M6–M7 | RLS/channel leakage |
| 9. PWA and Push Notifications | install/offline shell, preferences, subscriptions, outbox, delivery/scheduler | installability passes; no offline writes; idempotent retrying delivery proven | M6–M8 | iOS/Deno compatibility |
| 10. Security and Authorization Hardening | complete RLS/definer/secret/abuse review | security matrix, cross-household, secret scan, append-only tests all pass | M3–M9 | privilege escalation |
| 11. Testing and Quality | cross-layer regression, accessibility, multi-session E2E, PWA QA | all CI suites pass reliably; acceptance gaps are zero or explicitly blocked | M7–M10 | flaky external flows |
| 12. Deployment and Release Readiness | production configuration, observability, Pages/Supabase runbooks, release gate | fresh deployment succeeds; runbook and manual iPhone evidence approved | M10–M11 | credentials, free-tier operations |

## 3. Epic and atomic issue catalog

| # | Issue | Milestone | Type | Model tier | Blocked by |
|---:|---|---|---|---|---|
| 1 | Epic: Repository foundation and engineering toolchain | 1 | Epic | Standard | — |
| 2 | Scaffold strict React, TypeScript, and Vite workspace | 1 | Implementation | Standard | — |
| 3 | Configure hash routing, providers, environment validation, and query keys | 1 | Implementation | Standard | #2 |
| 4 | Configure Tailwind design tokens and accessible application shell primitives | 1 | Implementation | Standard | #2 |
| 5 | Add CI and GitHub Pages subpath build workflow | 1 | Implementation | Standard | #2, #3 |
| 6 | Establish test tooling, quality scripts, and contributor documentation | 1 | Test/Docs | Mechanical | #2 |
| 7 | Epic: Supabase database foundation | 2 | Epic | Standard | #1 |
| 8 | Configure local Supabase development and migration conventions | 2 | Implementation | Mechanical | #2 |
| 9 | Create profiles, households, memberships, and shared database enums | 2 | Implementation | Standard | #8 |
| 10 | Create task series, schedule, rotation, occurrence, and event schema | 2 | Implementation | Standard | #9, #28 |
| 11 | Create notification preference, subscription, and outbox schema | 2 | Implementation | Standard | #9 |
| 12 | Add indexes, deterministic seed data, and generated database types | 2 | Implementation | Mechanical | #9–#11 |
| 13 | Add migration replay, constraint, and seed validation tests | 2 | Test | Standard | #9–#12 |
| 14 | Epic: Passwordless authentication | 3 | Epic | Standard | #7 |
| 15 | Implement typed Supabase auth/session and OTP services | 3 | Implementation | Standard | #3, #9 |
| 16 | Build email OTP request and six-digit verification screens | 3 | Implementation | Standard | #4, #15 |
| 17 | Implement protected routing, intended-route restoration, and sign-out cleanup | 3 | Implementation | Standard | #3, #15 |
| 18 | Add authentication component and session integration tests | 3 | Test | Standard | #15–#17 |
| 19 | Epic: Households, memberships, invitations, and categories | 3 | Epic | High Intelligence | #7 |
| 20 | Implement household/profile RLS and create_household RPC | 3 | Security | High Intelligence | #9 |
| 21 | Build household list, switcher, creation, and timezone UI | 3 | Implementation | Standard | #4, #17, #20 |
| 22 | Create invitation schema constraints and secure token lifecycle | 3 | Security | High Intelligence | #9 |
| 23 | Implement invitation send, accept, revoke, and resend operations | 3 | Implementation | Standard | #15, #20, #22 |
| 24 | Implement category schema policies, RPCs, and management UI | 3 | Implementation | Standard | #20, #21 |
| 25 | Build membership and invitation management UI with integration tests | 3 | Implementation/Test | Standard | #21, #23 |
| 26 | Prove guest household isolation with initial RLS test matrix | 3 | Security/Test | High Intelligence | #20, #22 |
| 27 | Epic: Task series and recurrence engine | 4 | Epic | High Intelligence | #7, #19 |
| 28 | Freeze recurrence, timezone, occurrence-key, and edit-scope contracts | 4 | Design | High Intelligence | #9 |
| 29 | Implement task schema migration and recurrence JSON validation | 4 | Implementation | Standard | #10, #28 |
| 30 | Implement calendar recurrence and schedule-slot domain engine | 4 | Implementation | High Intelligence | #28, #29 |
| 31 | Implement household-timezone and daylight-saving resolution | 4 | Implementation | High Intelligence | #28, #30 |
| 32 | Implement completion-interval scheduling and end conditions | 4 | Implementation | High Intelligence | #29, #31 |
| 33 | Implement idempotent calendar occurrence generation | 4 | Implementation | Standard | #29–#31 |
| 34 | Implement missed-task policies and pause/resume generation behavior | 4 | Implementation | Standard | #33 |
| 35 | Build validated task create/edit forms for every v1 schedule | 4 | Implementation | Standard | #4, #24, #28–#32 |
| 36 | Add recurrence, timezone, generation, and missed-policy test suite | 4 | Test | High Intelligence | #30–#34 |
| 37 | Epic: Assignment and round-robin rotation | 5 | Epic | High Intelligence | #27 |
| 38 | Freeze round-robin cursor, completion-basis, recalculation, and Undo semantics | 5 | Design | High Intelligence | #28 |
| 39 | Implement pure rotation engine and roster eligibility rules | 5 | Implementation | High Intelligence | #29, #38 |
| 40 | Implement fixed, unassigned, claim, assign, and reassign RPCs | 5 | Implementation | Standard | #20, #29, #46 |
| 41 | Integrate round-robin assignment into occurrence generation | 5 | Implementation | Standard | #33, #39 |
| 42 | Implement future unlocked assignment recalculation and audit events | 5 | Implementation | High Intelligence | #39, #41, #47 |
| 43 | Build assignment, claim, roster reorder, and lock UI | 5 | Implementation | Standard | #25, #35, #40–#42 |
| 44 | Add rotation and assignment unit/database integration tests | 5 | Test | High Intelligence | #39–#43 |
| 45 | Epic: Transactional task lifecycle and audit history | 6 | Epic | High Intelligence | #27, #37 |
| 46 | Freeze transactional mutation, error, version, and idempotency contracts | 6 | Design/Security | High Intelligence | #20, #29 |
| 47 | Implement append-only task events, grants, and safe event writer | 6 | Security | High Intelligence | #29, #46 |
| 48 | Implement atomic complete_occurrence with rotation and interval successor | 6 | Implementation | High Intelligence | #32, #39, #46, #47 |
| 49 | Implement atomic snooze_occurrence and shared snooze history | 6 | Implementation | Standard | #46, #47 |
| 50 | Implement atomic skip_occurrence and cancel_occurrence | 6 | Implementation | Standard | #32, #46, #47 |
| 51 | Implement undo_completion and reopen_occurrence with rotation repair | 6 | Implementation | High Intelligence | #38, #42, #46–#48 |
| 52 | Implement series edit scopes, pause/resume, and soft deletion RPCs | 6 | Implementation | High Intelligence | #34, #46, #47 |
| 53 | Add typed occurrence mutation services, hooks, and conflict translation | 6 | Implementation | Standard | #3, #40, #48–#52 |
| 54 | Add lifecycle concurrency, append-only, and soft-deletion database tests | 6 | Security/Test | High Intelligence | #47–#53 |
| 55 | Epic: Mobile application interface | 7 | Epic | Standard | #14, #19, #45 |
| 56 | Implement authorized Today query, due-state projection, ordering, and filters | 7 | Implementation | Standard | #31, #53 |
| 57 | Build Today screen with status sections, cards, date navigation, and filters | 7 | Implementation | Standard | #4, #21, #56 |
| 58 | Build occurrence details and complete, snooze, skip, Undo, and conflict dialogs | 7 | Implementation | Standard | #53, #57 |
| 59 | Build Upcoming grouped-date screen and filters | 7 | Implementation | Standard | #56, #57 |
| 60 | Build Tasks list, task details, series lifecycle, and edit-scope UI | 7 | Implementation | Standard | #35, #43, #52 |
| 61 | Build Households, members, categories, profile, notification, and install settings shell | 7 | Implementation | Standard | #21, #24, #25 |
| 62 | Build authorized History timeline and filter experience | 7 | Implementation | Standard | #47, #53 |
| 63 | Add responsive, accessibility, guest-interface, and state component tests | 7 | Test | Standard | #57–#62 |
| 64 | Epic: Authorized realtime synchronization | 8 | Epic | High Intelligence | #19, #45, #55 |
| 65 | Validate Realtime RLS/channel design and implement subscription manager | 8 | Implementation/Security | High Intelligence | #20, #26, #47, #53 |
| 66 | Implement table-to-query invalidation and authoritative refetch | 8 | Implementation | Standard | #56, #65 |
| 67 | Implement remote-change feedback, stale mutation recovery, and cache purge | 8 | Implementation | Standard | #17, #58, #65, #66 |
| 68 | Add two-session Realtime, guest filtering, and revocation integration tests | 8 | Security/Test | High Intelligence | #65–#67 |
| 69 | Epic: Installable PWA and Web Push notifications | 9 | Epic | High Intelligence | #45, #64 |
| 70 | Validate standards-based Web Push in current Supabase Deno runtime | 9 | Spike | High Intelligence | #8 |
| 71 | Implement PWA manifest, icons, service worker, update flow, and online-only guard | 9 | Implementation | Standard | #5, #17, #57 |
| 72 | Implement notification preferences and per-device subscription management | 9 | Implementation/Security | Standard | #11, #15, #61, #70 |
| 73 | Implement durable notification outbox, recipient rules, and idempotency | 9 | Implementation/Security | High Intelligence | #11, #20, #26, #46–#50 |
| 74 | Implement mutation and schedule notification producers | 9 | Implementation | Standard | #33, #34, #48–#50, #73 |
| 75 | Implement Web Push delivery Edge Function with retry/device disabling | 9 | Implementation/Security | High Intelligence | #70, #72–#74 |
| 76 | Implement scheduled processor for generation, missed policies, due work, and retries | 9 | Implementation | High Intelligence | #33, #34, #73–#75 |
| 77 | Add PWA, offline, notification, scheduler, and push contract tests | 9 | Test | High Intelligence | #71–#76 |
| 78 | Epic: Security and authorization hardening | 10 | Epic | High Intelligence | #19, #45, #69 |
| 79 | Complete exhaustive full-member, guest, outsider, and removed-user RLS matrix | 10 | Security/Test | High Intelligence | #26, #54, #68, #72–#76 |
| 80 | Audit security-definer functions, grants, search_path, and append-only protections | 10 | Security | High Intelligence | #20, #23, #40, #47–#52, #73–#76 |
| 81 | Harden secret handling, invitation/push privacy, logging, and CI scanning | 10 | Security | High Intelligence | #22, #23, #70–#76 |
| 82 | Perform cross-household abuse-case security review and remediate findings | 10 | Security | High Intelligence | #79–#81 |
| 83 | Epic: Release-level testing and quality | 11 | Epic | High Intelligence | #55, #64, #69, #78 |
| 84 | Complete unit, component, accessibility, and error-state regression suite | 11 | Test | Standard | #36, #44, #63, #77 |
| 85 | Complete database, RLS, multi-session, and task-lifecycle E2E suite | 11 | Test | High Intelligence | #54, #68, #79, #80 |
| 86 | Complete PWA, notification, deployment-artifact, and performance QA | 11 | Test | High Intelligence | #77, #81, #84, #85 |
| 87 | Epic: Production deployment and release readiness | 12 | Epic | Standard | #78, #83 |
| 88 | Document and validate production Supabase, OTP, secrets, Functions, and cron setup | 12 | Documentation | Mechanical | #75, #76, #81, #85 |
| 89 | Finalize GitHub Pages, custom-domain, observability, privacy, and operations runbooks | 12 | Documentation/Implementation | Standard | #5, #71, #81, #86 |
| 90 | Execute release validation, manual iPhone acceptance, and launch checklist | 12 | Test/Release | High Intelligence | #82, #84–#89 |

## 4. Product requirement traceability

| Product requirement | Issues |
|---|---|
| Passwordless six-digit email OTP and persistent session | #15–#18, #84 |
| Return to invitation/intended route | #17, #23, #84 |
| Multiple households and household timezone | #20, #21, #31, #56 |
| Full-member permissions | #20, #40, #48–#52, #79 |
| Guest sees only explicitly assigned occurrences | #26, #65, #68, #79, #85 |
| Invitation expiry, revocation, reuse, and email binding | #22, #23, #25, #81 |
| Categories and safe soft deletion | #24, #60, #61 |
| Separate task series and authoritative occurrences | #10, #28, #29, #33 |
| One-time tasks and all-day boundaries | #28–#31, #35, #36 |
| Daily, weekdays, multiple exact times/windows | #28–#31, #33, #35, #36 |
| Completion-relative intervals | #32, #48, #50, #54 |
| End conditions and pause/resume | #32, #34, #52 |
| Fixed assignment | #40, #43, #44 |
| Unassigned and claim | #40, #43, #44 |
| Round-robin rotation and roster management | #38–#44 |
| Completing another person’s turn | #38, #39, #41, #48, #51 |
| One-time Keep original rotation override | #38, #39, #48, #51 |
| Preserve locked/final historical assignments | #39, #42, #44, #51 |
| Upcoming/due/overdue derived states | #31, #56, #84 |
| Missed-task policies | #34, #36, #76 |
| Shared snooze preserving original due | #49, #53, #58 |
| Skip distinct from completion | #50, #53, #58 |
| Confirmation-sensitive completion | #48, #58, #63 |
| 30-second Undo and later full-member reopen | #51, #58, #85 |
| First-update-wins and duplicate completion prevention | #46, #48, #54, #67, #85 |
| Recurring edit scopes and exceptions | #28, #35, #52, #60 |
| Soft deletion preserving history | #47, #52, #54, #62 |
| Append-only task history and filters | #47, #54, #62, #79, #80 |
| Today combined view, ordering, filters, date navigation | #56, #57, #63, #84 |
| Upcoming, Tasks, task/occurrence details | #58–#60, #63 |
| Households and Settings experiences | #21, #25, #61 |
| Realtime authoritative refetch and feedback | #65–#68 |
| Membership-removal channel/cache purge | #65, #67–#68, #79 |
| Global notification preferences and privacy | #72, #81 |
| Per-device push subscriptions | #70, #72, #75 |
| Durable idempotent notification outbox | #73–#77 |
| Scheduled generation/missed/notifications/retry | #76, #77 |
| Installable iPhone PWA and user-initiated push | #71, #72, #77, #86, #90 |
| Offline shell with online-only mutations | #71, #77, #84, #86 |
| Supabase RLS and safe security-definer functions | #20, #26, #46–#52, #79–#82 |
| GitHub Pages and subpath/custom domain | #3, #5, #71, #86, #89 |
| Seed data | #12, #13 |
| WCAG AA-oriented accessibility | #4, #58, #63, #84, #90 |
| Logging, privacy, and observability | #75, #76, #81, #89 |
| Migration sequencing and generated types | #8–#13, #88 |
| Full definition-of-done system validation | #84–#86, #90 |

No version 1 requirement is intentionally unmapped. Version 1 non-goals remain out of scope for every atomic issue unless a later approved decision changes the product specification.

## 5. Ready queue at planning completion

Only #2 is initially `Ready`. High Intelligence design issue #28 may begin after #9 and #38 after #28; neither is initially Ready. Issues with unmet dependencies remain `Backlog` with `Dependency Status = Blocked`.

## 6. Definition of done for every atomic issue

- Implement only the issue scope with no unrelated changes.
- Add and pass the specified tests.
- Update relevant documentation.
- Verify authorization, RLS, secrets, and concurrency requirements.
- Check every objective acceptance criterion with evidence.
- Use repository-local Christopher Brown identity.
- Open a focused pull request linked to the issue.
- Require CI to pass; do not merge without explicit instruction.
