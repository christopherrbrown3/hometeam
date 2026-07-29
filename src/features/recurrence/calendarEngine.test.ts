import { describe, expect, it } from 'vitest'
import { buildCalendarOccurrenceSeeds } from './calendarEngine'
import { occurrenceKey } from './occurrenceKey'

describe('calendar recurrence engine', () => {
  it('generates only selected weekday slots with deterministic unique keys', () => {
    const seeds = buildCalendarOccurrenceSeeds(
      { frequency: 'weekly', version: 1, weekdays: [1, 3, 5] },
      [{ isAllDay: false, startTime: '08:00', endTime: '08:15' }, { isAllDay: false, startTime: '20:00', endTime: '20:15' }],
      '2026-03-02', '2026-03-08',
    )
    expect(seeds).toHaveLength(6)
    expect(seeds.map((seed) => seed.occurrenceKey)).toEqual([
      '2026-03-02|08:00-08:15|0|0', '2026-03-02|20:00-20:15|0|1',
      '2026-03-04|08:00-08:15|0|0', '2026-03-04|20:00-20:15|0|1',
      '2026-03-06|08:00-08:15|0|0', '2026-03-06|20:00-20:15|0|1',
    ])
  })

  it('rejects invalid weekday recurrence contracts', () => {
    expect(() => buildCalendarOccurrenceSeeds({ frequency: 'weekly', version: 1 }, [{ isAllDay: true }], '2026-03-02', '2026-03-03')).toThrow('Choose at least one weekday')
    expect(occurrenceKey('2026-03-02', { isAllDay: true }, 0)).toBe('2026-03-02|all-day|0|0')
  })

  it('uses the last day when a monthly date does not exist', () => {
    const seeds = buildCalendarOccurrenceSeeds(
      { dayOfMonth: 31, frequency: 'monthly', version: 1 },
      [{ isAllDay: true }],
      '2026-02-01', '2026-04-30',
    )
    expect(seeds.map((seed) => seed.localDate)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })
})
