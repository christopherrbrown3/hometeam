import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

type HomeTeamClient = SupabaseClient<Database>

export type CurrentAccess = Readonly<{
  isAdministrator: boolean
  status: Database['public']['Enums']['platform_access_status']
}>

export async function getCurrentAccess(client: HomeTeamClient): Promise<CurrentAccess> {
  const { data, error } = await client.rpc('get_current_access')

  if (error) {
    throw error
  }

  const access = data[0]

  if (!access) {
    throw new Error('Your account access is still being initialized. Please refresh in a moment.')
  }

  return { isAdministrator: access.is_administrator, status: access.status }
}

export async function setAccessStatus(
  client: HomeTeamClient,
  userId: string,
  status: Database['public']['Enums']['platform_access_status'],
) {
  const { error } = await client.rpc('set_platform_access_status', {
    target_status: status,
    target_user_id: userId,
  })

  if (error) {
    throw error
  }
}

export async function getSignupApprovalSetting(client: HomeTeamClient): Promise<boolean> {
  const { data, error } = await client.rpc('get_signup_approval_setting')

  if (error) {
    throw error
  }

  const setting = data[0]

  if (!setting) {
    throw new Error('The signup approval setting is unavailable.')
  }

  return setting.require_signup_approval
}

export async function setSignupApprovalSetting(
  client: HomeTeamClient,
  requireApproval: boolean,
) {
  const { error } = await client.rpc('set_signup_approval_setting', {
    input_require_signup_approval: requireApproval,
  })

  if (error) {
    throw error
  }
}
