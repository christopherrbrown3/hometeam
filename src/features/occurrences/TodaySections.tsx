import type { OccurrenceWithTitle } from './todayQuery'
import { occurrenceDueState, type DisplayDueState } from './dueState'
import { TaskCard } from './TaskCard'

const labels: Record<DisplayDueState, string> = { overdue: 'Needs attention', due: 'Due now', snoozed: 'Snoozed', upcoming: 'Upcoming', completed: 'Completed' }

export function TodaySections({ occurrences, onOpen }: Readonly<{ occurrences: OccurrenceWithTitle[]; onOpen: (occurrence: OccurrenceWithTitle) => void }>) {
  const groups = (Object.keys(labels) as DisplayDueState[]).map((state) => [state, occurrences.filter((occurrence) => occurrenceDueState(occurrence) === state)] as const).filter(([, items]) => items.length)
  return <div className="space-y-6">{groups.map(([state, items]) => <section key={state}><h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{labels[state]} · {items.length}</h2><div className="space-y-2">{items.map((occurrence) => <TaskCard key={occurrence.id} occurrence={occurrence} onOpen={() => onOpen(occurrence)} />)}</div></section>)}</div>
}
