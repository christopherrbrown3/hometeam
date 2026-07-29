import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

type Client = SupabaseClient<Database>
type Event = Database['public']['Tables']['task_events']['Row']

export type HistoryEvent = Event & Readonly<{
  actorName: string | null
  occurrenceDueStart: string | null
  seriesTitle: string
}>

export async function listHistory(client: Client, householdId?: string): Promise<HistoryEvent[]> {
  let query = client.from('task_events').select('*').order('created_at', { ascending: false }).limit(200)
  if (householdId) query = query.eq('household_id', householdId)
  const { data: events, error } = await query
  if (error) throw error

  const seriesIds = [...new Set(events.map((event) => event.series_id))]
  const actorIds = [...new Set(events.flatMap((event) => event.actor_user_id ? [event.actor_user_id] : []))]
  const occurrenceIds = [...new Set(events.flatMap((event) => event.occurrence_id ? [event.occurrence_id] : []))]
  const [{ data: series, error: seriesError }, { data: profiles, error: profilesError }, { data: occurrences, error: occurrencesError }] = await Promise.all([
    seriesIds.length ? client.from('task_series').select('id, title').in('id', seriesIds) : Promise.resolve({ data: [], error: null }),
    actorIds.length ? client.from('profiles').select('user_id, display_name').in('user_id', actorIds) : Promise.resolve({ data: [], error: null }),
    occurrenceIds.length ? client.from('task_occurrences').select('id, original_due_start').in('id', occurrenceIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (seriesError) throw seriesError
  if (profilesError) throw profilesError
  if (occurrencesError) throw occurrencesError

  const titles = new Map(series.map((item) => [item.id, item.title]))
  const names = new Map(profiles.map((item) => [item.user_id, item.display_name]))
  const dueStarts = new Map(occurrences.map((item) => [item.id, item.original_due_start]))
  return events.map((event) => ({
    ...event,
    actorName: event.actor_user_id ? names.get(event.actor_user_id) ?? 'Household member' : null,
    occurrenceDueStart: event.occurrence_id ? dueStarts.get(event.occurrence_id) ?? null : null,
    seriesTitle: titles.get(event.series_id) ?? 'Household task',
  }))
}
