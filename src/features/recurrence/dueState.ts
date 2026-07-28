export type DueState = 'upcoming' | 'due' | 'overdue' | 'closed'

export function dueState(input: Readonly<{
  dueEnd: Date | string
  dueStart: Date | string
  lifecycleState: 'open' | 'completed' | 'skipped' | 'cancelled' | 'deleted'
  now?: Date
  snoozedUntil?: Date | string | null
}>): DueState {
  if (input.lifecycleState !== 'open') return 'closed'
  const now = input.now ?? new Date()
  const start = new Date(input.snoozedUntil ?? input.dueStart)
  if (now < start) return 'upcoming'
  if (now > new Date(input.dueEnd) && (!input.snoozedUntil || now > new Date(input.snoozedUntil))) return 'overdue'
  return 'due'
}
