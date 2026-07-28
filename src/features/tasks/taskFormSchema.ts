import { z } from 'zod'
import { calendarRecurrenceSchema, completionIntervalSchema, oneTimeRecurrenceSchema, scheduleSlotSchema } from '../recurrence/contracts'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.')

const commonSchema = z.object({
  assignmentMode: z.enum(['fixed', 'unassigned', 'round_robin']).default('unassigned'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  confirmationRequired: z.boolean().default(false),
  description: z.string().max(2_000).default(''),
  effectiveFrom: dateSchema,
  endAfterOccurrences: z.coerce.number().int().positive().optional(),
  endAt: dateSchema.optional(),
  endType: z.enum(['never', 'on_date', 'after_occurrences']).default('never'),
  fixedAssigneeId: z.string().uuid().optional().or(z.literal('')),
  missedPolicy: z.enum(['keep_overdue', 'skip_when_next_occurrence_begins', 'keep_newest']).default('keep_overdue'),
  slots: z.array(scheduleSlotSchema).min(1).max(12),
  title: z.string().trim().min(1, 'Enter a task title.').max(200),
})

export const taskFormSchema = z.discriminatedUnion('recurrenceType', [
  commonSchema.extend({ recurrenceConfig: oneTimeRecurrenceSchema, recurrenceType: z.literal('one_time'), seriesType: z.literal('one_time') }),
  commonSchema.extend({ recurrenceConfig: calendarRecurrenceSchema, recurrenceType: z.literal('calendar'), seriesType: z.literal('recurring') }),
  commonSchema.extend({ recurrenceConfig: completionIntervalSchema, recurrenceType: z.literal('completion_interval'), seriesType: z.literal('recurring') }),
]).superRefine((value, context) => {
  if (value.assignmentMode === 'fixed' && !value.fixedAssigneeId) context.addIssue({ code: 'custom', message: 'Choose who is assigned.', path: ['fixedAssigneeId'] })
  if (value.endType === 'on_date' && !value.endAt) context.addIssue({ code: 'custom', message: 'Choose an end date.', path: ['endAt'] })
  if (value.endType === 'after_occurrences' && !value.endAfterOccurrences) context.addIssue({ code: 'custom', message: 'Enter an occurrence count.', path: ['endAfterOccurrences'] })
})

export type TaskFormValues = z.infer<typeof taskFormSchema>
