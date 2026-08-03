import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { AssigneeColor, ProfileColor } from '../profiles/profileColors'

type Client = SupabaseClient<Database>
type Event = Database['public']['Tables']['task_events']['Row']

export type HistoryEvent = Event & Readonly<{
  assigneeColor: AssigneeColor
  assigneeName: string | null
  actorName: string | null
  categoryName: string | null
  occurrenceDueStart: string | null
  seriesTitle: string
}>

export async function listHistory(client: Client, householdId?: string): Promise<HistoryEvent[]> {
  let query = client.from('task_events').select('*').order('created_at', { ascending: false }).limit(200)
  if (householdId) query = query.eq('household_id', householdId)
  const { data: events, error } = await query
  if (error) throw error

  const seriesIds = [...new Set(events.map((event) => event.series_id))]
  const occurrenceIds = [...new Set(events.flatMap((event) => event.occurrence_id ? [event.occurrence_id] : []))]
  const householdIds = [...new Set(events.map((event) => event.household_id))]
  const [{ data: series, error: seriesError }, { data: profiles, error: profilesError }, { data: occurrences, error: occurrencesError }, { data: categories, error: categoriesError }] = await Promise.all([
    seriesIds.length ? client.from('task_series').select('id, title, category_id, fixed_assignee_id').in('id', seriesIds) : Promise.resolve({ data: [], error: null }),
    client.from('profiles').select('user_id, display_name, profile_color'),
    occurrenceIds.length ? client.from('task_occurrences').select('id, original_due_start, assignee_user_id').in('id', occurrenceIds) : Promise.resolve({ data: [], error: null }),
    householdIds.length ? client.from('categories').select('id, name').in('household_id', householdIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (seriesError) throw seriesError
  if (profilesError) throw profilesError
  if (occurrencesError) throw occurrencesError
  if (categoriesError) throw categoriesError

  const titles = new Map(series.map((item) => [item.id, item.title]))
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]))
  const seriesCategoryNames = new Map(series.map((item) => [item.id, item.category_id ? categoryNames.get(item.category_id) ?? null : null]))
  const names = new Map(profiles.map((item) => [item.user_id, item.display_name]))
  const colors = new Map<string, ProfileColor>(profiles.map((item) => [item.user_id, item.profile_color]))
  const occurrencesById = new Map(occurrences.map((item) => [item.id, item]))
  const fixedAssignees = new Map(series.map((item) => [item.id, item.fixed_assignee_id]))
  return events.map((event) => {
    const occurrence = event.occurrence_id ? occurrencesById.get(event.occurrence_id) : undefined
    const assigneeId = occurrence ? occurrence.assignee_user_id : fixedAssignees.get(event.series_id)
    return {
      ...event,
      assigneeColor: assigneeId ? colors.get(assigneeId) ?? 'blue' : 'unassigned',
      assigneeName: assigneeId ? names.get(assigneeId) ?? 'Household member' : null,
      actorName: event.actor_user_id ? names.get(event.actor_user_id) ?? 'Household member' : null,
      categoryName: seriesCategoryNames.get(event.series_id) ?? null,
      occurrenceDueStart: occurrence?.original_due_start ?? null,
      seriesTitle: titles.get(event.series_id) ?? 'Household task',
    }
  })
}
