import { describe, expect, it } from 'vitest'
import { categoryNamesBySeries, occurrenceFallsOnDate } from './todayQuery'

describe('Today calendar-date filtering', () => {
  it('uses the household calendar date rather than the UTC date', () => {
    expect(occurrenceFallsOnDate('2026-07-29T03:30:00Z', '2026-07-29', 'America/New_York')).toBe(false)
    expect(occurrenceFallsOnDate('2026-07-29T04:30:00Z', '2026-07-29', 'America/New_York')).toBe(true)
  })

  it('does not carry an earlier overdue occurrence into the selected date', () => {
    expect(occurrenceFallsOnDate('2026-07-28T16:00:00Z', '2026-07-29', 'America/New_York')).toBe(false)
  })
})

describe('Occurrence category metadata', () => {
  it('carries the task category name onto every occurrence series', () => {
    expect(categoryNamesBySeries([
      { id: 'series-cleaning', category_id: 'category-cleaning' },
      { id: 'series-uncategorized', category_id: null },
    ], [
      { id: 'category-cleaning', name: 'Cleaning' },
    ])).toEqual(new Map([
      ['series-cleaning', 'Cleaning'],
      ['series-uncategorized', null],
    ]))
  })
})
