import { completionIntervalSchema } from './contracts'

export function nextCompletionIntervalDue(anchor: Date | string, recurrence: Readonly<{ intervalMinutes: number; version: 1 }>) {
  const config = completionIntervalSchema.parse(recurrence)
  return new Date(new Date(anchor).getTime() + config.intervalMinutes * 60_000)
}

export function hasReachedEndCondition(input: Readonly<{
  completedOrGeneratedCount: number
  endAfterOccurrences?: number | null
  endAt?: string | null
  nextDue: Date
}>) {
  return (input.endAfterOccurrences !== null && input.endAfterOccurrences !== undefined && input.completedOrGeneratedCount >= input.endAfterOccurrences)
    || (input.endAt !== null && input.endAt !== undefined && input.nextDue.toISOString().slice(0, 10) > input.endAt)
}
