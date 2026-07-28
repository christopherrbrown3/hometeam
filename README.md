# HomeTeam

**Tasks. Together. Done right.**

HomeTeam is a planned production-quality shared household task coordination PWA. It gives every scheduled task occurrence one authoritative state, supports full members and tightly isolated guests, and coordinates recurring work, round-robin turns, realtime updates, and Web Push notifications. During public preview, authenticated users must be explicitly approved by a platform administrator before they can access any household feature or data.

## Planning status

Implementation is underway, beginning with the repository foundation. Work is performed one ready GitHub issue at a time on a focused branch, with its acceptance criteria verified before merge.

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

Authorization is enforced in PostgreSQL and transactional RPC functions, not only in the UI. Platform approval is separate from household membership: administrators approve preview access but do not automatically gain access to household data. Privileged keys never enter frontend bundles or committed files. HomeTeam notifications are coordination aids and must not be treated as the sole medically reliable reminder system.

## Implementation workflow

1. Select a Ready atomic issue whose dependencies are complete.
2. Read the linked planning documents and dependency issues.
3. Create the issue branch required by the issue.
4. Implement only that issue, including its tests and documentation.
5. Open a pull request linked to the issue; do not merge without explicit approval.

## Local development

HomeTeam currently includes the foundation, passwordless email sign-in, preview-access approval, household creation/switching, invitation links, categories, and database-enforced full-member/guest isolation. Use Node.js 22+ and npm:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and provide only the Supabase project URL and publishable key. Do not put database passwords, secret keys, or service-role keys in any `VITE_` environment variable; Vite embeds those values in the browser bundle.

Run `npm run typecheck` for strict TypeScript validation and `npm run build` for the production bundle. Hash routing, session persistence, intended-route restoration, six-digit email-code verification, the query provider, environment validation, and stable query-key factories are now in place. Set the Supabase Auth email template to include `{{ .Token }}` (rather than a confirmation URL) to deliver six-digit codes. New Supabase Free projects need custom SMTP to customize that email template; keep its credentials in Supabase, never in this repository.

The first production sign-in creates a `pending` access request. Bootstrap that known account exactly once from the Supabase SQL editor, using its UUID from `auth.users`:

```sql
select private.bootstrap_platform_administrator('<authenticated-user-uuid>');
```

This database-only operation approves that account and makes it the platform administrator. It is not callable from the browser. The administrator can then approve other preview requests in `#/access`; administrator status never supplies household membership or household-data access. Invitation links are one-time, email-bound links. The app copies each newly created link for the full member to deliver through their chosen private channel; production email delivery needs a configured transactional email provider and is deliberately not attempted from the browser.

The GitHub Pages workflow uses the base path supplied by GitHub Pages: `/hometeam/` on the default project URL and `/` for `hometeam.christopherbrown.ai`. To verify either layout locally, run `VITE_APP_BASE_PATH=/hometeam/ npm run build` or `VITE_APP_BASE_PATH=/ npm run build` (the legacy `VITE_BASE_PATH` alias is also supported).

## Local Supabase development

HomeTeam uses versioned Supabase migrations as its database source of truth.
Install Docker Desktop or another Docker-compatible container runtime, then
start the local stack from the repository root:

```sh
npx --yes supabase@2.110.0 start
npx --yes supabase@2.110.0 status -o env
```

Copy the local `API_URL` and browser-safe `ANON_KEY`/publishable key reported by
the status command into `.env.local` as `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`; then run `npm run dev`. The local Studio is at
`http://127.0.0.1:54323` and the local email inbox is at
`http://127.0.0.1:54324`. Do not put the database URL, password, service-role
key, VAPID private key, or any other privileged value into `.env.local` or a
`VITE_` variable.

Migration files will be added by their dedicated database issues. Create them
only through the CLI, treat them as immutable once shared, and replay them with
`npx --yes supabase@2.110.0 db reset` before review. The full migration
workflow and security rules are in [supabase/migrations/README.md](supabase/migrations/README.md).

After starting the local stack, run the database contract suite with
`npm run test:db`. It uses pgTAP to check migration replay, foundation
constraints and default-deny access, and deterministic seed fixtures.
