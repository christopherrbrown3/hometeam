export type IsoDate = `${number}-${number}-${number}`
export type LocalTime = string

export type ScheduleSlot = Readonly<{
  endDayOffset?: 0 | 1
  endTime?: LocalTime
  isAllDay: boolean
  startTime?: LocalTime
}>

export type CalendarRecurrence = Readonly<{
  frequency: 'daily' | 'weekly'
  version: 1
  weekdays?: readonly number[]
}>

export type CompletionIntervalRecurrence = Readonly<{
  intervalMinutes: number
}>

export type OccurrenceSeed = Readonly<{
  isAllDay: boolean
  localDate: IsoDate
  slot: ScheduleSlot
}>

export type HouseholdDateTime = Readonly<{
  date: IsoDate
  time: LocalTime
}>
