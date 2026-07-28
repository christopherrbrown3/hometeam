import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database'
import type { TaskFormValues } from './taskFormSchema'

type HomeTeamClient = SupabaseClient<Database>

function removeEmptyValues(value: unknown): Json {
  if (Array.isArray(value)) return value.map(removeEmptyValues)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== '' && child !== undefined).map(([key, child]) => [key, removeEmptyValues(child)])) as Json
  }
  return value as Json
}

export async function saveTaskSeries(client: HomeTeamClient, values: TaskFormValues & { householdId: string; id?: string }) {
  const { data, error } = await client.rpc('save_task_series', { input: removeEmptyValues(values) })
  if (error || !data) throw error ?? new Error('The task could not be saved.')
  return data
}
