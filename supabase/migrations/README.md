# HomeTeam database migrations

`supabase/migrations/` is the immutable, ordered source of truth for the
HomeTeam database. Do not apply hand-written changes directly to a shared or
production database.

## Current schema baseline

The first migration, `20260728132552_identity_households.sql`, defines the
shared `household_member_role` (`full_member` or `guest`) and
`household_membership_status` (`active` or `removed`) enums, along with
`profiles`, `households`, and `household_memberships`. It validates stored IANA
timezone names and permits only one active membership for a user in a
household.

All three tables have forced RLS and no browser-role grants or policies at this
stage. This deliberate default-deny baseline is not a client API: the
platform-access and household authorization work in later issues will add only
the narrowly authorized reads and controlled writes required by the product.

The task-core migration, `20260728134450_task_core.sql`, adds the series,
daily-slot, rotation-roster, occurrence, and event records. It locks an
occurrence to the household of its series and makes `(series_id,
occurrence_key)` unique, preventing duplicate generation. It deliberately
stores only the versioned recurrence JSON container; the recurrence contract
and semantic validator remain owned by the later recurrence issues.

## Local workflow

Install a Docker-compatible container runtime, then start the local stack from
the repository root. The commands below use the version tested for this
repository without adding a global dependency:

```sh
npx --yes supabase@2.110.0 start
npx --yes supabase@2.110.0 status -o env
```

The status command prints local connection details. Copy only
`API_URL` and the browser-safe `ANON_KEY`/publishable key into `.env.local` as
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Do not copy a database
connection string, service-role key, or any private key into a Vite variable.
The local email inbox is available at `http://127.0.0.1:54324` while the stack
is running.

## Creating a migration

Create each migration with the CLI; it supplies the sortable timestamped file
name:

```sh
npx --yes supabase@2.110.0 migration new describe_change_in_lowercase
```

Write forward-only SQL in the generated file. Migrations must be idempotent
only where PostgreSQL permits a safe repeatable declaration, but each file is
applied once and must never be edited after it has been shared or applied. A
correction is a new migration.

Use explicit schema qualification in privileged SQL, enable and force RLS for
every exposed table, and grant Data API access deliberately. Client-supplied
user, household, role, or target identifiers are claims to validate, never
authorization. Do not place secrets, real household data, or raw invitation and
push tokens in migrations or seed fixtures.

## Replay and verification

Before review, replay the local database from scratch and inspect migration
state:

```sh
npx --yes supabase@2.110.0 db reset
npx --yes supabase@2.110.0 migration list --local
```

`db reset` runs migrations in timestamp order and, once issue #12 supplies it,
loads `supabase/seed.sql`. Database/RLS test suites belong with the migration
issue that introduces behavior. Generated TypeScript database types are
refreshed after schema changes by issue #12 and later schema issues; do not
hand-author them.
