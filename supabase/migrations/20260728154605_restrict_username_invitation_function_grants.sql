-- Recreating a function restores PostgreSQL's default PUBLIC execute grant.
-- These RPCs are browser APIs for authenticated users only.
revoke execute on function public.create_household_invitation(uuid, text, public.household_member_role, integer) from public, anon;
revoke execute on function public.list_household_invitations(uuid) from public, anon;

grant execute on function public.create_household_invitation(uuid, text, public.household_member_role, integer) to authenticated;
grant execute on function public.list_household_invitations(uuid) to authenticated;
