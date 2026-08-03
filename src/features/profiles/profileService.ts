import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { ProfileColor } from './profileColors'

type Client = SupabaseClient<Database>
export type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'profile_color' | 'user_id' | 'username'>

const profileColumns = 'user_id, display_name, username, profile_color' as const

export async function getProfile(client: Client, userId: string): Promise<Profile> {
  const { data, error } = await client.from('profiles').select(profileColumns).eq('user_id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfileColor(client: Client, userId: string, profileColor: ProfileColor): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .update({ profile_color: profileColor })
    .eq('user_id', userId)
    .select(profileColumns)
    .single()
  if (error) throw error
  return data
}
