import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { householdDateAt, nextIsoDate, resolveHouseholdDateTime } from '../../lib/householdTime'
import { dueStateOrder, occurrenceDueState } from './dueState'
import { filterOccurrences, type OccurrenceFilters } from './filters'

type Client = SupabaseClient<Database>
export type OccurrenceWithTitle = Database['public']['Tables']['task_occurrences']['Row'] & Readonly<{
  assigneeName: string | null
  householdTimeZone: string
  title: string
}>

export function occurrenceFallsOnDate(originalDueStart: string, date: NonNullable<OccurrenceFilters['date']>, timeZone: string) {
  return householdDateAt(originalDueStart, timeZone) === date
}

export async function getAuthorizedOccurrences(client: Client, filters: OccurrenceFilters = {}): Promise<OccurrenceWithTitle[]> {
  const { data: households, error: householdsError } = filters.householdId && filters.householdTimeZone
    ? { data: [{ id: filters.householdId, timezone: filters.householdTimeZone }], error: null }
    : await client.from('households').select('id, timezone')
  if (householdsError) throw householdsError
  const timeZones = new Map(households.map((household) => [household.id, household.timezone]))

  let request = client.from('task_occurrences').select('*').in('lifecycle_state', ['open', 'completed']).order('original_due_start')
  if (filters.householdId) request = request.eq('household_id', filters.householdId)
  if (filters.date && timeZones.size) {
    const selectedDate = filters.date
    const bounds = [...timeZones.values()].map((timeZone) => ({
      end: resolveHouseholdDateTime({ date: nextIsoDate(selectedDate), time: '00:00' }, timeZone).toISOString(),
      start: resolveHouseholdDateTime({ date: selectedDate, time: '00:00' }, timeZone).toISOString(),
    }))
    request = request
      .gte('original_due_start', bounds.map(({ start }) => start).sort()[0])
      .lt('original_due_start', bounds.map(({ end }) => end).sort().at(-1)!)
  }
  const { data, error } = await request
  if (error) throw error
  const seriesIds = [...new Set(data.map((occurrence) => occurrence.series_id))]
  const assigneeIds = [...new Set(data.flatMap((occurrence) => occurrence.assignee_user_id ? [occurrence.assignee_user_id] : []))]
  const [{ data: series, error: seriesError }, { data: profiles, error: profilesError }] = await Promise.all([
    seriesIds.length
      ? client.from('task_series').select('id, title').in('id', seriesIds)
      : Promise.resolve({ data: [], error: null }),
    assigneeIds.length
      ? client.from('profiles').select('user_id, display_name').in('user_id', assigneeIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (seriesError) throw seriesError
  if (profilesError) throw profilesError
  const titles = new Map(series.map((item) => [item.id, item.title]))
  const names = new Map(profiles.map((profile) => [profile.user_id, profile.display_name]))
  const now = new Date()
  return filterOccurrences(data, filters)
    .filter((occurrence) => !filters.date || occurrenceFallsOnDate(
      occurrence.original_due_start,
      filters.date,
      timeZones.get(occurrence.household_id) ?? filters.householdTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    ))
    .map((occurrence) => ({
      ...occurrence,
      assigneeName: occurrence.assignee_user_id ? names.get(occurrence.assignee_user_id) ?? 'Household member' : null,
      householdTimeZone: timeZones.get(occurrence.household_id) ?? filters.householdTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      title: titles.get(occurrence.series_id) ?? 'Household task',
    }))
    .sort((left, right) => dueStateOrder[occurrenceDueState(left, now)] - dueStateOrder[occurrenceDueState(right, now)] || left.original_due_start.localeCompare(right.original_due_start))
}
