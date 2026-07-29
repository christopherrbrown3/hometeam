import type { OccurrenceWithTitle } from './todayQuery'
import { TaskCard } from './TaskCard'

export function UpcomingGroups({ occurrences, onOpen }: Readonly<{ occurrences: OccurrenceWithTitle[]; onOpen: (item: OccurrenceWithTitle) => void }>) {
  const groups = new Map<string, OccurrenceWithTitle[]>()
  for (const occurrence of occurrences) { const day = new Date(occurrence.original_due_start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); groups.set(day, [...(groups.get(day) ?? []), occurrence]) }
  return <div className="space-y-6">{[...groups].map(([day, items]) => <section key={day}><h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{day}</h2><div className="space-y-2">{items.map((item) => <TaskCard key={item.id} occurrence={item} onOpen={() => onOpen(item)}/>)}</div></section>)}</div>
}
