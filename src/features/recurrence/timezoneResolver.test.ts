import { describe, expect, it } from 'vitest'
import { dueState } from './dueState'
import { resolveSlotInHouseholdTime } from './timezoneResolver'

describe('household timezone resolution', () => {
  it('advances a nonexistent New York spring-forward local time to the next real minute', () => {
    const resolved = resolveSlotInHouseholdTime('2026-03-08', { isAllDay: false, startTime: '02:30', endTime: '03:00' }, 'America/New_York')
    expect(resolved.dueStart.toISOString()).toBe('2026-03-08T07:00:00.000Z')
  })

  it('selects the earlier instant for an ambiguous fall-back local time', () => {
    const resolved = resolveSlotInHouseholdTime('2026-11-01', { isAllDay: false, startTime: '01:30', endTime: '02:00' }, 'America/New_York')
    expect(resolved.dueStart.toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('derives states without a lifecycle write', () => {
    expect(dueState({ dueStart: '2026-01-01T10:00:00Z', dueEnd: '2026-01-01T11:00:00Z', lifecycleState: 'open', now: new Date('2026-01-01T10:30:00Z') })).toBe('due')
    expect(dueState({ dueStart: '2026-01-01T10:00:00Z', dueEnd: '2026-01-01T11:00:00Z', lifecycleState: 'open', now: new Date('2026-01-01T11:01:00Z') })).toBe('overdue')
  })
})
