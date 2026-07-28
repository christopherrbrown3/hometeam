export type RotationMember = Readonly<{
  userId: string
  position: number
  isActive: boolean
  hasActiveHouseholdMembership: boolean
}>

export type RotationOccurrence = Readonly<{
  id: string
  dueAt: string
  assigneeUserId: string | null
  assignmentLocked: boolean
  assignmentSource: 'round_robin' | 'manual' | 'fixed' | 'claimed' | 'unassigned'
  lifecycleState: 'open' | 'completed' | 'skipped' | 'cancelled' | 'deleted'
}>

export type RotationCompletion = Readonly<{
  originalAssigneeUserId: string | null
  completedByUserId: string
  keepOriginalRotation: boolean
}>
