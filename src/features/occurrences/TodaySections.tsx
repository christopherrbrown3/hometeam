import type { OccurrenceWithTitle } from './todayQuery'
import { occurrenceDueState, type DisplayDueState } from './dueState'
import { TaskCard } from './TaskCard'

const labels: Record<DisplayDueState, string> = { overdue: 'Overdue', due: 'Due now', snoozed: 'Snoozed', upcoming: 'Later today', completed: 'Completed' }

export function TodaySections({ occurrences, onOpen }: Readonly<{ occurrences: OccurrenceWithTitle[]; onOpen: (occurrence: OccurrenceWithTitle) => void }>) {
  const groups = (Object.keys(labels) as DisplayDueState[]).map((state) => [state, occurrences.filter((occurrence) => occurrenceDueState(occurrence) === state)] as const).filter(([, items]) => items.length)
  return <div className="space-y-7">{groups.map(([state, items]) => <section key={state}><div className="section-heading"><h2>{labels[state]}</h2><span className="section-count">{items.length}</span></div><div className="list-surface">{items.map((occurrence) => <TaskCard key={occurrence.id} occurrence={occurrence} onOpen={() => onOpen(occurrence)} />)}</div></section>)}</div>
}
