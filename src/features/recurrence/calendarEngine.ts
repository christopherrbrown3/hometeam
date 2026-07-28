import { calendarRecurrenceSchema, scheduleSlotSchema } from './contracts'
import { occurrenceKey } from './occurrenceKey'
import type { CalendarRecurrence, IsoDate, OccurrenceSeed, ScheduleSlot } from './types'

function asDate(value: IsoDate) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid local calendar date.')
  return date
}

function formatDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate
}

function includesDate(recurrence: CalendarRecurrence, date: Date) {
  return recurrence.frequency === 'daily' || recurrence.weekdays?.includes(date.getUTCDay()) === true
}

/** Produces local household dates; timezone resolution happens at the database/client boundary. */
export function buildCalendarOccurrenceSeeds(
  recurrenceInput: CalendarRecurrence,
  slotsInput: readonly ScheduleSlot[],
  from: IsoDate,
  through: IsoDate,
): Array<OccurrenceSeed & { occurrenceKey: string }> {
  const recurrence = calendarRecurrenceSchema.parse(recurrenceInput)
  const slots = slotsInput.map((slot) => scheduleSlotSchema.parse(slot))
  const start = asDate(from)
  const end = asDate(through)
  if (start > end) throw new Error('The generation range ends before it starts.')

  const output: Array<OccurrenceSeed & { occurrenceKey: string }> = []
  for (let cursor = start; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!includesDate(recurrence, cursor)) continue
    const localDate = formatDate(cursor)
    slots.forEach((slot, index) => output.push({
      isAllDay: slot.isAllDay,
      localDate,
      occurrenceKey: occurrenceKey(localDate, slot, index),
      slot,
    }))
  }
  return output
}
