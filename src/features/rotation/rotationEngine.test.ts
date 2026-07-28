import { describe, expect, it } from 'vitest'
import { nextRotationAssignee, recalculateFutureAssignments, rotationCompletionBasis } from './rotationEngine'
import type { RotationMember, RotationOccurrence } from './types'

const roster: RotationMember[] = [
  { userId: 'alex', position: 0, isActive: true, hasActiveHouseholdMembership: true },
  { userId: 'sam', position: 1, isActive: true, hasActiveHouseholdMembership: true },
  { userId: 'removed', position: 2, isActive: true, hasActiveHouseholdMembership: false },
]

const open = (id: string, dueAt: string, assigneeUserId: string | null = null): RotationOccurrence => ({ id, dueAt, assigneeUserId, assignmentLocked: false, assignmentSource: 'round_robin', lifecycleState: 'open' })

describe('rotation engine', () => {
  it('cycles eligible members and skips unavailable roster entries', () => {
    expect(nextRotationAssignee(roster, null)).toBe('alex')
    expect(nextRotationAssignee(roster, 'alex')).toBe('sam')
    expect(nextRotationAssignee(roster, 'sam')).toBe('alex')
  })

  it('uses the actual eligible completer unless the one-time override is selected', () => {
    expect(rotationCompletionBasis(roster, { originalAssigneeUserId: 'alex', completedByUserId: 'sam', keepOriginalRotation: false })).toBe('sam')
    expect(rotationCompletionBasis(roster, { originalAssigneeUserId: 'alex', completedByUserId: 'sam', keepOriginalRotation: true })).toBe('alex')
    expect(rotationCompletionBasis(roster, { originalAssigneeUserId: 'alex', completedByUserId: 'outside', keepOriginalRotation: false })).toBe('alex')
  })

  it('recalculates only unlocked automatic open rows', () => {
    const locked = { ...open('locked', '2026-09-02T09:00:00Z', 'sam'), assignmentLocked: true, assignmentSource: 'manual' as const }
    const closed = { ...open('closed', '2026-09-03T09:00:00Z', 'alex'), lifecycleState: 'completed' as const }
    const result = recalculateFutureAssignments(roster, [open('first', '2026-09-01T09:00:00Z'), locked, open('second', '2026-09-04T09:00:00Z'), closed], 'sam')
    expect(result.map((item) => item.assigneeUserId)).toEqual(['alex', 'sam', 'alex', 'alex'])
  })
})
