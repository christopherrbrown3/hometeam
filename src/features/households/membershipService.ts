import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

type HomeTeamClient = SupabaseClient<Database>
type MemberRole = Database['public']['Enums']['household_member_role']

export type HouseholdMember = Readonly<{
  displayName: string
  email: string
  role: MemberRole
  userId: string
}>

export type HouseholdInvitation = Database['public']['Functions']['list_household_invitations']['Returns'][number]

export async function listHouseholdMembers(client: HomeTeamClient, householdId: string): Promise<HouseholdMember[]> {
  const { data: memberships, error: membershipError } = await client
    .from('household_memberships')
    .select('user_id, role')
    .eq('household_id', householdId)

  if (membershipError) throw membershipError

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('user_id, display_name, email')

  if (profileError) throw profileError

  return memberships.flatMap((membership) => {
    const profile = profiles.find((candidate) => candidate.user_id === membership.user_id)
    return profile ? [{ displayName: profile.display_name, email: profile.email, role: membership.role, userId: membership.user_id }] : []
  })
}

export async function listHouseholdInvitations(client: HomeTeamClient, householdId: string) {
  const { data, error } = await client.rpc('list_household_invitations', { input_household_id: householdId })
  if (error) throw error
  return data
}

export async function createInvitation(
  client: HomeTeamClient,
  householdId: string,
  email: string,
  role: MemberRole,
) {
  const { data, error } = await client.rpc('create_household_invitation', {
    input_email: email,
    input_household_id: householdId,
    input_role: role,
  })
  if (error || !data[0]) throw error ?? new Error('The invitation could not be created.')
  return data[0]
}

export async function revokeInvitation(client: HomeTeamClient, invitationId: string) {
  const { error } = await client.rpc('revoke_household_invitation', { input_invitation_id: invitationId })
  if (error) throw error
}
