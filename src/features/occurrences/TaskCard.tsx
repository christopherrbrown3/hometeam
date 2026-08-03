import { StatusBadge } from '../../components/ui/StatusBadge'
import { Icon } from '../../components/ui/Icon'
import { CategoryIcon } from '../categories/CategoryIcon'
import type { OccurrenceWithTitle } from './todayQuery'
import { occurrenceDueState } from './dueState'

export function TaskCard({ occurrence, onOpen }: Readonly<{ occurrence: OccurrenceWithTitle; onOpen?: () => void }>) {
  const state = occurrenceDueState(occurrence)
  const tone = state === 'overdue' ? 'danger' : state === 'due' ? 'warning' : state === 'completed' ? 'success' : 'neutral'
  const due = new Date(occurrence.original_due_start)
  const dueLabel = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: occurrence.householdTimeZone })

  return (
    <button className="group flex w-full items-center gap-3 bg-surface p-4 text-left transition-colors duration-200 hover:bg-brand-soft/25" onClick={onOpen} type="button">
      <CategoryIcon categoryName={occurrence.categoryName} className="group-hover:-translate-y-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate font-semibold ${state === 'completed' ? 'text-muted line-through' : 'text-ink'}`}>{occurrence.title}</span>
          {(state === 'overdue' || state === 'due' || state === 'snoozed') && <StatusBadge tone={tone}>{state === 'due' ? 'Due now' : state}</StatusBadge>}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{state === 'snoozed' ? `Snoozed until ${new Date(occurrence.snoozed_until!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: occurrence.householdTimeZone })}` : occurrence.is_all_day ? 'All day' : `Due ${dueLabel}`}</span>
          <span className="inline-flex items-center gap-1"><Icon name="user" size={14} weight="duotone" /> {occurrence.assigneeName ?? 'Unassigned'}</span>
        </span>
      </span>
      <Icon className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" name="chevron-right" size={18} />
    </button>
  )
}
