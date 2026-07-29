import type { QueryKey } from '@tanstack/react-query'
import type { RealtimeChange } from './subscriptionManager'

/** Query-key prefixes affected by a row signal. Payload values are not cached. */
export function queryKeysForRealtimeChange(change: RealtimeChange): readonly QueryKey[] {
  const occurrenceId = typeof change.record.id === 'string' ? change.record.id : undefined

  switch (change.table) {
    case 'platform_access': return [['current-access']]
    case 'household_memberships': return [['memberships'], ['members'], ['households'], ['occurrences'], ['upcoming'], ['history'], ['series']]
    case 'task_series': return [['series'], ['series-detail'], ['occurrences'], ['upcoming']]
    case 'task_events': return [['history'], ['occurrences'], ['upcoming']]
    case 'task_occurrences': return [...(occurrenceId ? [['occurrence', occurrenceId] as QueryKey] : []), ['occurrences'], ['upcoming'], ['history']]
  }
}
