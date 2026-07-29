import { StatusBadge } from '../../components/ui/StatusBadge'
import type { OccurrenceWithTitle } from './todayQuery'
import { occurrenceDueState } from './dueState'

export function TaskCard({ occurrence, onOpen }: Readonly<{ occurrence: OccurrenceWithTitle; onOpen?: () => void }>) {
  const state = occurrenceDueState(occurrence)
  const tone = state === 'overdue' ? 'danger' : state === 'due' ? 'warning' : state === 'completed' ? 'success' : 'neutral'
  return <button className="w-full rounded-panel border border-border bg-canvas p-4 text-left shadow-sm transition hover:border-brand" onClick={onOpen} type="button">
    <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{occurrence.title}</h3><StatusBadge tone={tone}>{state === 'due' ? 'Due now' : state}</StatusBadge></div>
    <p className="mt-2 text-sm text-muted">Due {new Date(occurrence.original_due_start).toLocaleString()}</p>
    {occurrence.assignee_user_id && <p className="mt-1 text-xs text-muted">Assigned</p>}
    {state === 'snoozed' && <p className="mt-1 text-xs text-muted">Snoozed until {new Date(occurrence.snoozed_until!).toLocaleTimeString()}</p>}
  </button>
}
