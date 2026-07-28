import { z } from 'zod'

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time such as 08:30.')

export const calendarRecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly']),
  weekdays: z.array(z.int().min(0).max(6)).min(1).max(7).optional(),
  version: z.literal(1),
}).superRefine((value, context) => {
  if (value.frequency === 'weekly' && !value.weekdays?.length) {
    context.addIssue({ code: 'custom', message: 'Choose at least one weekday.', path: ['weekdays'] })
  }
  if (value.frequency === 'daily' && value.weekdays?.length) {
    context.addIssue({ code: 'custom', message: 'Daily schedules cannot include weekdays.', path: ['weekdays'] })
  }
})

export const completionIntervalSchema = z.object({
  intervalMinutes: z.int().min(1).max(525_600 * 2),
  version: z.literal(1),
})

export const oneTimeRecurrenceSchema = z.object({ version: z.literal(1) }).strict()

export const scheduleSlotSchema = z.object({
  endDayOffset: z.union([z.literal(0), z.literal(1)]).default(0),
  endTime: localTimeSchema.optional(),
  isAllDay: z.boolean(),
  startTime: localTimeSchema.optional(),
}).superRefine((slot, context) => {
  if (slot.isAllDay && (slot.startTime || slot.endTime)) {
    context.addIssue({ code: 'custom', message: 'All-day slots do not have times.', path: ['isAllDay'] })
  }
  if (!slot.isAllDay && !slot.startTime) {
    context.addIssue({ code: 'custom', message: 'Choose a start time.', path: ['startTime'] })
  }
  if (!slot.isAllDay && slot.endTime && slot.endDayOffset === 0 && slot.endTime < slot.startTime!) {
    context.addIssue({ code: 'custom', message: 'End time must follow the start time.', path: ['endTime'] })
  }
})

export type CalendarRecurrenceInput = z.infer<typeof calendarRecurrenceSchema>
export type CompletionIntervalInput = z.infer<typeof completionIntervalSchema>
export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>
