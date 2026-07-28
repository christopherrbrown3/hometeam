import type { IsoDate, ScheduleSlot } from './types'

/** A deterministic, human-auditable key. It never includes a device timezone. */
export function occurrenceKey(localDate: IsoDate, slot: ScheduleSlot, slotIndex: number) {
  const kind = slot.isAllDay ? 'all-day' : `${slot.startTime}-${slot.endTime ?? slot.startTime}`
  return `${localDate}|${kind}|${slot.endDayOffset ?? 0}|${slotIndex}`
}
