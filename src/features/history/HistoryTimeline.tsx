import { Icon } from '../../components/ui/Icon'
import { TaskIcon } from '../categories/TaskIcon'
import type { HistoryEvent } from './historyService'

const labels: Record<HistoryEvent['event_type'], string> = {
  assigned: 'Assigned',
  cancelled: 'Cancelled',
  claimed: 'Claimed',
  completed: 'Completed',
  completion_undone: 'Completion undone',
  occurrence_deleted: 'Occurrence deleted',
  occurrence_generated: 'Occurrence scheduled',
  reassigned: 'Reassigned',
  reopened: 'Reopened',
  rotation_recalculated: 'Rotation updated',
  series_created: 'Task created',
  series_deleted: 'Task deleted',
  series_paused: 'Task paused',
  series_resumed: 'Task resumed',
  series_updated: 'Task updated',
  skipped: 'Skipped',
  snooze_changed: 'Snooze changed',
  snoozed: 'Snoozed',
}

function payloadDetail(event: HistoryEvent) {
  const payload = event.event_payload as Record<string, unknown>
  if (event.event_type === 'completed') return event.actorName ? `Completed by ${event.actorName}` : 'Marked complete'
  if (event.event_type === 'skipped') return payload.reason === 'series_paused' ? 'Skipped because the task was paused' : typeof payload.reason === 'string' ? `Reason: ${payload.reason}` : 'Marked skipped'
  if (event.event_type === 'snoozed' || event.event_type === 'snooze_changed') return typeof payload.snoozedUntil === 'string' ? `Until ${new Date(payload.snoozedUntil).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Deferred for later'
  if (event.event_type === 'series_updated') return payload.scope === 'future_schedule' ? 'Future scheduled occurrences were refreshed' : 'Task settings were changed'
  if (event.event_type === 'series_paused') return typeof payload.skippedOverdueOccurrences === 'number' && payload.skippedOverdueOccurrences > 0 ? `${payload.skippedOverdueOccurrences} overdue occurrence${payload.skippedOverdueOccurrences === 1 ? '' : 's'} moved to history` : 'Future work is hidden until resumed'
  if (event.event_type === 'assigned' || event.event_type === 'reassigned' || event.event_type === 'claimed') return event.actorName ? `Updated by ${event.actorName}` : 'Assignment updated'
  if (event.event_type === 'cancelled') return typeof payload.reason === 'string' ? `Reason: ${payload.reason}` : 'Cancelled'
  return event.actorName ? `Updated by ${event.actorName}` : null
}

export function HistoryTimeline({ events }: Readonly<{ events: HistoryEvent[] }>) {
  return (
    <ol className="relative ml-5 border-l border-border">
      {events.map((event) => {
        const detail = payloadDetail(event)
        return (
          <li className="relative pb-6 pl-7 last:pb-0" key={event.id}>
            <span className="absolute -left-4 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border-4 border-canvas bg-brand-soft text-brand"><Icon name={event.event_type === 'completed' ? 'check' : 'activity'} size={15} /></span>
            <div className="rounded-panel bg-surface px-4 py-3">
              <div className="flex items-start gap-3">
                <TaskIcon assigneeColor={event.assigneeColor} categoryName={event.categoryName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{labels[event.event_type]}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{event.seriesTitle}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted"><Icon name="user" size={14} weight="duotone" /> {event.assigneeName ?? 'Unassigned'}</p>
                  {event.occurrenceDueStart && <p className="mt-0.5 text-sm text-muted">Scheduled for {new Date(event.occurrenceDueStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                  {detail && <p className="mt-0.5 text-sm text-muted">{detail}</p>}
                  <p className="mt-2 text-xs text-muted">{new Date(event.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
