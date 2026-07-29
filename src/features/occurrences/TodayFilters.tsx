import type { DisplayDueState } from './dueState'

export function TodayFilters({ status, onStatus }: Readonly<{ status: DisplayDueState | 'all'; onStatus: (value: DisplayDueState | 'all') => void }>) {
  return <label className="block text-sm font-semibold">Status<select aria-label="Filter Today by status" className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onStatus(event.target.value as DisplayDueState | 'all')} value={status}><option value="all">All tasks</option><option value="overdue">Needs attention</option><option value="due">Due now</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></label>
}
