import { describe, expect, it } from 'vitest'
import { addDefaultEndTime, changeSlotEnd, changeSlotStart, normalizeDatabaseTime } from './taskTime'

describe('task time helpers', () => {
  it('normalizes PostgreSQL time values before placing them in the task form', () => {
    expect(normalizeDatabaseTime('08:30:00')).toBe('08:30')
    expect(normalizeDatabaseTime('18:05:42')).toBe('18:05')
    expect(normalizeDatabaseTime(null)).toBeUndefined()
  })

  it('moves the end time by the same offset when the start changes', () => {
    expect(changeSlotStart(
      { endDayOffset: 0, endTime: '10:30', isAllDay: false, startTime: '09:00' },
      '11:15',
    )).toEqual({ endDayOffset: 0, endTime: '12:45', isAllDay: false, startTime: '11:15' })
  })

  it('preserves a time window when shifting it across midnight', () => {
    expect(changeSlotStart(
      { endDayOffset: 0, endTime: '23:45', isAllDay: false, startTime: '23:00' },
      '23:30',
    )).toEqual({ endDayOffset: 1, endTime: '00:15', isAllDay: false, startTime: '23:30' })
  })

  it('adds a short optional window and understands an earlier end as next day', () => {
    expect(addDefaultEndTime({ endDayOffset: 0, isAllDay: false, startTime: '23:45' }))
      .toMatchObject({ endDayOffset: 1, endTime: '00:15' })
    expect(changeSlotEnd(
      { endDayOffset: 0, isAllDay: false, startTime: '23:00' },
      '01:00',
    )).toMatchObject({ endDayOffset: 1, endTime: '01:00' })
  })
})
