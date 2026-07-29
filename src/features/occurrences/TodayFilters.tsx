import type { DisplayDueState } from './dueState'

export function TodayFilters({ status, onStatus }: Readonly<{ status: DisplayDueState | 'all'; onStatus: (value: DisplayDueState | 'all') => void }>) {
  const filters: readonly [DisplayDueState | 'all', string][] = [['all', 'All'], ['overdue', 'Overdue'], ['due', 'Due now'], ['upcoming', 'Later today'], ['completed', 'Completed']]
  return (
    <div aria-label="Filter Today by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group">
      {filters.map(([value, label]) => (
        <button
          aria-pressed={status === value}
          className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${status === value ? 'bg-ink text-white' : 'border border-border bg-surface text-muted hover:border-brand/35 hover:text-ink'}`}
          key={value}
          onClick={() => onStatus(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
