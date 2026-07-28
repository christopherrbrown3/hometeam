import { describe, expect, it } from 'vitest'
import { hasReachedEndCondition, nextCompletionIntervalDue } from './completionInterval'

describe('completion interval', () => {
  it('anchors the next occurrence to the actual terminal action', () => {
    expect(nextCompletionIntervalDue('2026-03-01T12:00:00Z', { intervalMinutes: 480, version: 1 }).toISOString()).toBe('2026-03-01T20:00:00.000Z')
  })

  it('respects count and date end conditions', () => {
    expect(hasReachedEndCondition({ completedOrGeneratedCount: 3, endAfterOccurrences: 3, nextDue: new Date('2026-03-01T12:00:00Z') })).toBe(true)
    expect(hasReachedEndCondition({ completedOrGeneratedCount: 1, endAt: '2026-02-28', nextDue: new Date('2026-03-01T12:00:00Z') })).toBe(true)
  })
})
