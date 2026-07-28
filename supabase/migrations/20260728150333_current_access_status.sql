create function public.get_current_access()
returns table (status public.platform_access_status, is_administrator boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select access.status, private.is_platform_administrator(auth.uid())
  from public.platform_access access
  where access.user_id = auth.uid();
$$;

revoke all on function public.get_current_access() from public, anon;
grant execute on function public.get_current_access() to authenticated;
