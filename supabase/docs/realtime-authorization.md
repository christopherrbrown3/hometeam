# Realtime authorization

HomeTeam uses Supabase Postgres Changes only as an invalidation signal. The browser never applies a change payload to task state: it invalidates the affected TanStack Query entries and fetches the authoritative, RLS-protected projection again.

## Published tables

`platform_access`, `household_memberships`, `task_series`, `task_occurrences`, and `task_events` are in the `supabase_realtime` publication. They already have RLS and authenticated `SELECT` grants from the authorization migrations. No Realtime-specific bypass, service key, or broad client write permission is used.

## Channel scope

- A full member receives one filtered channel per active household. Its task, event, series, and membership changes are filtered by `household_id`.
- A guest receives occurrence changes filtered by their own `assignee_user_id`; safe task-event delivery remains protected by the existing event RLS policy, which joins the event to a currently assigned occurrence. Guests never subscribe to series or household-wide membership feeds.
- Every signed-in product user receives a personal `platform_access` and membership channel filtered by `user_id`, so suspension or removal causes an immediate access refetch.

The client starts channels only after the access gate has approved the session and loaded active memberships. On a sign-out, suspension, or membership loss it unsubscribes first, cancels in-flight queries, then clears protected cache entries. A removed user may retain an old browser tab, but database RLS rejects future REST and Realtime reads and the local cache is purged.

## Operational checks

After applying the migration, verify publication membership with:

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
```

The local `realtime_guest_rls` test verifies publication membership and the guest/removal read boundary. The browser integration tests verify channel teardown and authoritative query invalidation without treating payload data as trusted state.
