# HomeTeam

**Tasks. Together. Done right.**

HomeTeam is a planned production-quality shared household task coordination PWA. It gives every scheduled task occurrence one authoritative state, supports full members and tightly isolated guests, and coordinates recurring work, round-robin turns, realtime updates, and Web Push notifications.

## Planning status

This repository is in the planning baseline phase. It intentionally contains no React, Vite, Supabase, or production application implementation yet. Implementation work must be performed one GitHub issue at a time on an `issue-<issue-number>-<short-description>` branch and submitted through a pull request.

## Documentation

- [Product specification](PRODUCT_SPEC.md) — authoritative product behavior and version 1 scope
- [Architecture](ARCHITECTURE.md) — system boundaries, contracts, data flow, and implementation shape
- [Implementation plan](IMPLEMENTATION_PLAN.md) — milestones, issue catalog, and requirements traceability
- [Decisions](DECISIONS.md) — defaults selected where the specification leaves a choice open
- [Dependency map](DEPENDENCY_MAP.md) — critical path, parallel work, and external blockers
- [Security model](SECURITY_MODEL.md) — authorization, RLS, secrets, and threat mitigations
- [Test strategy](TEST_STRATEGY.md) — test layers and requirement coverage

## Planned stack

- React, strict TypeScript, Vite, hash-based React Router
- TanStack Query, React Hook Form, Zod, Tailwind CSS
- Supabase PostgreSQL, Auth, RLS, Realtime, Edge Functions, and scheduled processing
- Vitest, React Testing Library, Playwright, and SQL/RLS tests
- `vite-plugin-pwa`, standards-based Web Push, GitHub Actions, and GitHub Pages

## Security and safety

Authorization is enforced in PostgreSQL and transactional RPC functions, not only in the UI. Privileged keys never enter frontend bundles or committed files. HomeTeam notifications are coordination aids and must not be treated as the sole medically reliable reminder system.

## Implementation workflow

1. Select a Ready atomic issue whose dependencies are complete.
2. Read the linked planning documents and dependency issues.
3. Create the issue branch required by the issue.
4. Implement only that issue, including its tests and documentation.
5. Open a pull request linked to the issue; do not merge without explicit approval.

Local setup, migration, testing, Supabase, VAPID, Pages, custom-domain, iPhone installation, and operations instructions will be added by the implementation issues identified in `IMPLEMENTATION_PLAN.md`.
