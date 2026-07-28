import type { RotationCompletion, RotationMember, RotationOccurrence } from './types'

/** Only active roster members with a current household membership may receive a turn. */
export function eligibleRotationMembers(members: readonly RotationMember[]) {
  return [...members].filter((member) => member.isActive && member.hasActiveHouseholdMembership).sort((left, right) => left.position - right.position)
}

export function nextRotationAssignee(members: readonly RotationMember[], afterUserId: string | null) {
  const eligible = eligibleRotationMembers(members)
  if (eligible.length === 0) return null
  const index = eligible.findIndex((member) => member.userId === afterUserId)
  return eligible[(index + 1 + eligible.length) % eligible.length]!.userId
}

/** The actual completer normally owns the turn; the one-time override retains the original turn. */
export function rotationCompletionBasis(members: readonly RotationMember[], completion: RotationCompletion) {
  const eligibleIds = new Set(eligibleRotationMembers(members).map((member) => member.userId))
  if (!completion.keepOriginalRotation && eligibleIds.has(completion.completedByUserId)) return completion.completedByUserId
  return completion.originalAssigneeUserId
}

/**
 * Rebuild automatic future assignments from a stable cursor. Locked/manual and
 * historical rows are preserved, while a preserved eligible assignee becomes
 * the basis for the next automatic occurrence.
 */
export function recalculateFutureAssignments(
  members: readonly RotationMember[],
  occurrences: readonly RotationOccurrence[],
  cursorUserId: string | null,
) {
  let basis = cursorUserId
  return [...occurrences]
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id))
    .map((occurrence) => {
      if (occurrence.lifecycleState !== 'open') return occurrence
      if (occurrence.assignmentLocked || occurrence.assignmentSource !== 'round_robin') {
        if (occurrence.assigneeUserId && eligibleRotationMembers(members).some((member) => member.userId === occurrence.assigneeUserId)) basis = occurrence.assigneeUserId
        return occurrence
      }
      const assigneeUserId = nextRotationAssignee(members, basis)
      basis = assigneeUserId
      return { ...occurrence, assigneeUserId }
    })
}
