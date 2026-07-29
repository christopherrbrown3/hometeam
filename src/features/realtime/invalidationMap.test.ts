import { describe, expect, it } from 'vitest'
import { queryKeysForRealtimeChange } from './invalidationMap'

describe('queryKeysForRealtimeChange', () => {
  it('invalidates an occurrence detail and authoritative list projections', () => {
    expect(queryKeysForRealtimeChange({ eventType: 'UPDATE', record: { id: 'occurrence-a' }, table: 'task_occurrences' })).toEqual([
      ['occurrence', 'occurrence-a'], ['occurrences'], ['upcoming'], ['history'],
    ])
  })

  it('does not derive cache state from an unrecognized payload field', () => {
    expect(queryKeysForRealtimeChange({ eventType: 'INSERT', record: { unexpected: 'untrusted' }, table: 'task_events' })).toEqual([
      ['history'], ['occurrences'], ['upcoming'],
    ])
  })
})
