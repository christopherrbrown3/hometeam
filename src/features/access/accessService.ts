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
    throw new Error('Your access request is still being created. Please refresh in a moment.')
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
