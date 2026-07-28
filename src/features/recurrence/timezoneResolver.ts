import { resolveHouseholdDateTime } from '../../lib/householdTime'
import type { IsoDate, ScheduleSlot } from './types'

export type ResolvedSlot = Readonly<{
  dueEnd: Date
  dueStart: Date
  isAllDay: boolean
}>

function followingDate(date: IsoDate): IsoDate {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10) as IsoDate
}

export function resolveSlotInHouseholdTime(localDate: IsoDate, slot: ScheduleSlot, timeZone: string): ResolvedSlot {
  if (slot.isAllDay) {
    const dueStart = resolveHouseholdDateTime({ date: localDate, time: '00:00' }, timeZone)
    return { dueStart, dueEnd: resolveHouseholdDateTime({ date: followingDate(localDate), time: '00:00' }, timeZone), isAllDay: true }
  }
  const dueStart = resolveHouseholdDateTime({ date: localDate, time: slot.startTime! }, timeZone)
  const endDate = slot.endDayOffset === 1 ? followingDate(localDate) : localDate
  const dueEnd = resolveHouseholdDateTime({ date: endDate, time: slot.endTime ?? slot.startTime! }, timeZone)
  return { dueStart, dueEnd, isAllDay: false }
}
