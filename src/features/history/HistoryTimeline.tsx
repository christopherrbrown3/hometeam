import type { Database } from '../../types/database'
import { Icon } from '../../components/ui/Icon'

export function HistoryTimeline({ events }: Readonly<{ events: Database['public']['Tables']['task_events']['Row'][] }>) {
  return (
    <ol className="relative ml-5 border-l border-border">
      {events.map((event) => {
        const label = event.event_type.replaceAll('_', ' ')
        return (
          <li className="relative pb-6 pl-7 last:pb-0" key={event.id}>
            <span className="absolute -left-4 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border-4 border-canvas bg-brand-soft text-brand">
              <Icon name={event.event_type === 'completed' ? 'check' : 'activity'} size={15} />
            </span>
            <div className="rounded-panel bg-surface px-4 py-3">
              <p className="font-semibold capitalize text-ink">{label}</p>
              <p className="mt-0.5 text-sm text-muted">{new Date(event.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
