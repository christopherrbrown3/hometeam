import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
type Client = SupabaseClient<Database>
export async function listHistory(client: Client, householdId?: string) { let query = client.from('task_events').select('*').order('created_at', { ascending: false }).limit(200); if (householdId) query = query.eq('household_id', householdId); const { data, error } = await query; if (error) throw error; return data }
