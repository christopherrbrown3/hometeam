import type { ScheduleSlotInput } from '../recurrence/contracts'
import type { LocalTime } from '../recurrence/types'

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function fromMinutes(minutes: number): LocalTime {
  const normalized = ((minutes % 1_440) + 1_440) % 1_440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}` as LocalTime
}

export function changeSlotStart(slot: ScheduleSlotInput, startTime: LocalTime): ScheduleSlotInput {
  if (!slot.startTime || !slot.endTime) return { ...slot, startTime }
  const duration = toMinutes(slot.endTime) + (slot.endDayOffset * 1_440) - toMinutes(slot.startTime)
  const shiftedEnd = toMinutes(startTime) + duration
  return {
    ...slot,
    endDayOffset: shiftedEnd >= 1_440 ? 1 : 0,
    endTime: fromMinutes(shiftedEnd),
    startTime,
  }
}

export function addDefaultEndTime(slot: ScheduleSlotInput): ScheduleSlotInput {
  const startTime = slot.startTime ?? '09:00'
  const end = toMinutes(startTime) + 30
  return { ...slot, endDayOffset: end >= 1_440 ? 1 : 0, endTime: fromMinutes(end), startTime }
}

export function changeSlotEnd(slot: ScheduleSlotInput, endTime?: LocalTime): ScheduleSlotInput {
  if (!endTime) return { ...slot, endDayOffset: 0, endTime: undefined }
  return {
    ...slot,
    endDayOffset: slot.startTime && toMinutes(endTime) < toMinutes(slot.startTime) ? 1 : 0,
    endTime,
  }
}
