import type { Database } from '../../types/database'
import { occurrenceDueState, type DisplayDueState } from './dueState'

type Occurrence = Database['public']['Tables']['task_occurrences']['Row']

export type OccurrenceFilters = Readonly<{
  assigneeId?: string
  householdId?: string
  mine?: boolean
  status?: DisplayDueState | 'all'
  unassigned?: boolean
}>

export function filterOccurrences(occurrences: Occurrence[], filters: OccurrenceFilters, actorId?: string) {
  return occurrences.filter((occurrence) =>
    (!filters.householdId || occurrence.household_id === filters.householdId)
    && (!filters.assigneeId || occurrence.assignee_user_id === filters.assigneeId)
    && (!filters.mine || occurrence.assignee_user_id === actorId)
    && (!filters.unassigned || occurrence.assignee_user_id === null)
    && (!filters.status || filters.status === 'all' || occurrenceDueState(occurrence) === filters.status),
  )
}
