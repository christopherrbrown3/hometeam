-- Realtime change payloads are never a source of authority in the client. The
-- existing SELECT policies are evaluated for every Postgres Changes delivery,
-- then the client refetches its RLS-protected projection.
alter publication supabase_realtime add table public.platform_access;
alter publication supabase_realtime add table public.household_memberships;
alter publication supabase_realtime add table public.task_series;
alter publication supabase_realtime add table public.task_occurrences;
alter publication supabase_realtime add table public.task_events;
