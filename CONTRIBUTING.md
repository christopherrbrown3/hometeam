# Contributing to HomeTeam

## Local setup

Use Node.js 22+ and npm, matching the repository's `package.json` engine requirement. Install dependencies with `npm install`.

Copy `.env.example` to `.env.local` when it is available. Frontend environment variables may contain only browser-safe values such as the Supabase project URL and publishable key. Never commit or expose database passwords, service-role keys, secret keys, or VAPID private keys.

Install the Playwright browser once with:

```sh
npm exec playwright install chromium
```

## Quality checks

Run these checks before requesting review:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:db
```

`npm run check` runs linting, strict type checking, unit/component tests, and the production build. End-to-end tests run against a locally built production artifact. Database and RLS changes also require the local Supabase test suite.

## Working agreement

Implement one ready GitHub issue per branch. Keep changes within that issue’s scope, add the relevant tests and documentation, and verify all applicable checks before merging. Do not commit credentials or sensitive household data. Database authorization, lifecycle transitions, and audit history belong in Supabase migrations and transactional functions, not UI-only checks.
