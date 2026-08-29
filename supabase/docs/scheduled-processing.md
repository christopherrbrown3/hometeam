# Scheduled processing and Web Push

Issues #75 and #76 add two server-only Supabase Edge Functions:

- `process-notifications` claims and delivers a bounded per-device push batch.
- `scheduled-task-processor` owns the once-per-minute lease and runs calendar
  generation, missed policies, due/overdue production, and delivery retries.

The scheduler normally calls the delivery module directly. The standalone
delivery endpoint is retained for controlled recovery and operational testing.
Both HTTP handlers set `verify_jwt = false` because Supabase Cron cannot mint a
user JWT; both fail closed unless `x-hometeam-processor-secret` exactly matches
the separate 32+ byte `NOTIFICATION_PROCESSOR_SECRET`.

## Required configuration

Create an ignored `.env.edge.local` and never pass the values on a command line:

```env
NOTIFICATION_PROCESSOR_SECRET=<at-least-32-random-bytes>
VAPID_PUBLIC_KEY=<application-server-public-key>
VAPID_PRIVATE_KEY=<application-server-private-key>
VAPID_SUBJECT=mailto:<operational-contact>
```

The browser receives the same public key as `VITE_VAPID_PUBLIC_KEY`; it never
receives the other three values. The hosted Edge Runtime supplies
`SUPABASE_URL` and `SUPABASE_SECRET_KEYS`. Local and older runtimes expose the
legacy `SUPABASE_SERVICE_ROLE_KEY`, which the functions support as a fallback.

Link the intended project, apply migrations, upload secrets, and deploy:

```sh
npx --yes supabase@2.110.0 link --project-ref <project-ref>
npx --yes supabase@2.110.0 db push --linked
npx --yes supabase@2.110.0 secrets set --env-file .env.edge.local
npx --yes supabase@2.110.0 functions deploy process-notifications
npx --yes supabase@2.110.0 functions deploy scheduled-task-processor
```

Run the database tests and the pinned Web Push compatibility probe before a
production deploy. Changing `@mmmike/web-push@1.3.0` or the Edge Runtime also
requires rerunning the probe documented in `web-push-compatibility.md`.

## Cron wiring

Enable the Supabase Cron and `pg_net` integrations. In Supabase Vault, create:

- `hometeam_project_url`: `https://<project-ref>.supabase.co`
- `hometeam_processor_secret`: the exact processor secret uploaded above

Then create the once-per-minute job in the SQL editor. The statement reads the
secret from Vault at execution time; do not replace it with a committed or
logged literal.

```sql
select cron.schedule(
  'hometeam-scheduled-task-processor',
  '* * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'hometeam_project_url'
      ) || '/functions/v1/scheduled-task-processor',
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hometeam-processor-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'hometeam_processor_secret'
        )
      ),
      body := '{"deliveryLimit":50,"generationHorizonDays":60,"notificationLimit":200}'::jsonb
    );
  $job$
);
```

Check the Cron job history and Edge Function logs after enabling it. Logs and
responses must contain only phase counts and bounded result codes—not task
titles, household names, user IDs, endpoints, keys, provider bodies, JWTs, or
secret values.

## Retry and recovery behavior

- One scheduler lease lasts 120 seconds. A concurrent invocation returns
  `locked`; an expired lease can be reclaimed.
- Notification claims use `FOR UPDATE SKIP LOCKED`. A crashed device attempt is
  retryable after its stale window and receives a new monotonic attempt number.
- HTTP 408/425/429/5xx and network errors use bounded exponential backoff;
  provider `Retry-After` is honored between 30 seconds and one hour.
- HTTP 404/410 disables only that subscription. Successful devices are terminal
  for that outbox row and are never included in its retries.
- Recipient access, membership, guest assignment, task state, and preferences
  are rechecked immediately before endpoint material leaves PostgreSQL.

Before treating production push as accepted, complete a real installed-iPhone
subscription, receipt, and click-routing check. Notifications are coordination
aids and must not be the sole reminder for medication or another safety-critical
task.
