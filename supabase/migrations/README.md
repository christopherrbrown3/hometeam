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

All three tables begin from a forced-RLS, default-deny baseline. Later ordered
migrations add platform-access approval, household authorization helpers,
join links, username/password identity, and the narrowly authorized reads and
controlled writes used by the client.

The task-core migration, `20260728134450_task_core.sql`, adds the series,
daily-slot, rotation-roster, occurrence, and event records. It locks an
occurrence to the household of its series and makes `(series_id,
occurrence_key)` unique, preventing duplicate generation. It deliberately
stores the versioned recurrence JSON container. Later migrations add the
semantic recurrence validator, materialization functions, schedule
improvements, lifecycle RPCs, rotation behavior, and supporting tests.

The notification migration, `20260728135020_notifications.sql`, adds one
preference record per user, device-specific push subscriptions, and a durable
notification outbox. Push endpoints and encryption keys remain protected
personal data: all three tables have forced RLS with no browser-role grants or
policies until the corresponding authorization migration grants owner-scoped
access. The outbox's unique idempotency key is the database-level
duplicate-delivery defense. End-to-end Web Push claiming and delivery are not
enabled in the current preview.

The index migration, `20260728135641_indexes.sql`, adds the lookup paths used
by active memberships, open occurrences, assignee and series occurrence lists,
household event history, pending notification work, and enabled device
subscriptions. Invitation and category indexes follow the migrations that
introduce those tables.

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
`supabase/seed.sql` provides fixed, development-only fixture data for Alex,
Sam, Grandma, two households, representative task states, recurring patterns,
and history records. It deliberately contains no real email address, push
endpoint, subscription key, invitation token, or medical detail. `db reset`
loads it automatically.

Generate the public-schema TypeScript contract from the local replayed schema;
do not hand-edit the generated file:

```sh
npx --yes supabase@2.110.0 gen types --local --schema public > src/types/database.ts
```

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
npm run test:db
```

`db reset` runs every migration in timestamp order and then loads
`supabase/seed.sql`. `npm run test:db` runs the pgTAP migration, constraint,
authorization, concurrency, recurrence, rotation, lifecycle, and seed suites.
Database/RLS tests belong with the migration that introduces behavior.
Refresh generated TypeScript database types after schema changes; do not
hand-author them.
