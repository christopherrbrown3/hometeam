import { describe, expect, it } from 'vitest'
import { occurrenceFallsOnDate } from './todayQuery'

describe('Today calendar-date filtering', () => {
  it('uses the household calendar date rather than the UTC date', () => {
    expect(occurrenceFallsOnDate('2026-07-29T03:30:00Z', '2026-07-29', 'America/New_York')).toBe(false)
    expect(occurrenceFallsOnDate('2026-07-29T04:30:00Z', '2026-07-29', 'America/New_York')).toBe(true)
  })

  it('does not carry an earlier overdue occurrence into the selected date', () => {
    expect(occurrenceFallsOnDate('2026-07-28T16:00:00Z', '2026-07-29', 'America/New_York')).toBe(false)
  })
})
