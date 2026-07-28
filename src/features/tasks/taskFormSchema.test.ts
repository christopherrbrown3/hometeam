import { describe, expect, it } from 'vitest'
import { taskFormSchema } from './taskFormSchema'

const base = {
  assignmentMode: 'unassigned', confirmationRequired: false, description: '', effectiveFrom: '2026-03-01', endType: 'never', missedPolicy: 'keep_overdue', slots: [{ isAllDay: false, startTime: '09:00', endTime: '09:15' }], title: 'Feed the dog', recurrenceConfig: { version: 1 }, recurrenceType: 'one_time', seriesType: 'one_time',
}

describe('task form schema', () => {
  it('accepts a one-time task and rejects a fixed task without an assignee', () => {
    expect(taskFormSchema.safeParse(base).success).toBe(true)
    expect(taskFormSchema.safeParse({ ...base, assignmentMode: 'fixed' }).success).toBe(false)
  })

  it('requires weekdays for a selected-weekday schedule', () => {
    expect(taskFormSchema.safeParse({ ...base, recurrenceType: 'calendar', seriesType: 'recurring', recurrenceConfig: { frequency: 'weekly', version: 1 } }).success).toBe(false)
  })
})
