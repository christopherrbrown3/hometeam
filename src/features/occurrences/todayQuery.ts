import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { dueStateOrder } from './dueState'
import { filterOccurrences, type OccurrenceFilters } from './filters'

type Client = SupabaseClient<Database>
export type OccurrenceWithTitle = Database['public']['Tables']['task_occurrences']['Row'] & Readonly<{ title: string }>

export async function getAuthorizedOccurrences(client: Client, filters: OccurrenceFilters = {}): Promise<OccurrenceWithTitle[]> {
  let request = client.from('task_occurrences').select('*').order('original_due_start').limit(200)
  if (filters.householdId) request = request.eq('household_id', filters.householdId)
  const { data, error } = await request
  if (error) throw error
  const seriesIds = [...new Set(data.map((occurrence) => occurrence.series_id))]
  const { data: series, error: seriesError } = seriesIds.length
    ? await client.from('task_series').select('id, title').in('id', seriesIds)
    : { data: [], error: null }
  if (seriesError) throw seriesError
  const titles = new Map(series.map((item) => [item.id, item.title]))
  return filterOccurrences(data, filters).map((occurrence) => ({ ...occurrence, title: titles.get(occurrence.series_id) ?? 'Household task' }))
    .sort((left, right) => dueStateOrder[(awaitableDueState(left))] - dueStateOrder[(awaitableDueState(right))] || left.original_due_start.localeCompare(right.original_due_start))
}

function awaitableDueState(occurrence: Database['public']['Tables']['task_occurrences']['Row']) {
  const now = new Date()
  if (occurrence.lifecycle_state === 'completed') return 'completed' as const
  if (occurrence.lifecycle_state !== 'open') return 'upcoming' as const
  if (occurrence.snoozed_until && new Date(occurrence.snoozed_until) > now) return 'snoozed' as const
  if (new Date(occurrence.original_due_end) < now) return 'overdue' as const
  return new Date(occurrence.original_due_start) <= now ? 'due' as const : 'upcoming' as const
}
