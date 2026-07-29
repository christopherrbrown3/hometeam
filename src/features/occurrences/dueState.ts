import type { Database } from '../../types/database'

type Occurrence = Database['public']['Tables']['task_occurrences']['Row']
export type DisplayDueState = 'completed' | 'due' | 'overdue' | 'snoozed' | 'upcoming'

export function occurrenceDueState(occurrence: Occurrence, now = new Date()): DisplayDueState {
  if (occurrence.lifecycle_state === 'completed') return 'completed'
  if (occurrence.lifecycle_state !== 'open') return 'upcoming'
  if (occurrence.snoozed_until && new Date(occurrence.snoozed_until) > now) return 'snoozed'
  if (new Date(occurrence.original_due_end) < now) return 'overdue'
  if (new Date(occurrence.original_due_start) <= now) return 'due'
  return 'upcoming'
}

export const dueStateOrder: Record<DisplayDueState, number> = { overdue: 0, due: 1, snoozed: 2, upcoming: 3, completed: 5 }
