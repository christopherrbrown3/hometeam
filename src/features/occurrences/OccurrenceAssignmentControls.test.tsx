import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../types/database'
import { OccurrenceAssignmentControls } from './OccurrenceAssignmentControls'

const members = [
  { displayName: 'Alex', username: 'alex', role: 'full_member' as const, userId: '00000000-0000-0000-0000-000000000101' },
  { displayName: 'Sam', username: 'sam', role: 'full_member' as const, userId: '00000000-0000-0000-0000-000000000102' },
]

function occurrence(overrides: Partial<Database['public']['Tables']['task_occurrences']['Row']> = {}): Database['public']['Tables']['task_occurrences']['Row'] {
  return { assignee_user_id: null, assignment_locked: false, assignment_source: 'unassigned', completed_at: null, completed_by: null, created_at: '2026-01-01T00:00:00Z', deleted_at: null, household_id: '00000000-0000-0000-0000-000000000201', id: '00000000-0000-0000-0000-000000000701', is_all_day: false, lifecycle_state: 'open', occurrence_key: 'fixture', original_due_end: '2026-01-01T09:15:00Z', original_due_start: '2026-01-01T09:00:00Z', rotation_override: false, series_id: '00000000-0000-0000-0000-000000000401', skip_reason: null, skipped_at: null, skipped_by: null, snoozed_by: null, snoozed_until: null, updated_at: '2026-01-01T00:00:00Z', version: 1, ...overrides }
}

describe('OccurrenceAssignmentControls', () => {
  it('claims an unassigned occurrence through the supplied action', async () => {
    const onClaim = vi.fn().mockResolvedValue(undefined)
    render(<OccurrenceAssignmentControls canManage members={members} occurrence={occurrence()} onAssign={vi.fn()} onClaim={onClaim} onToggleLock={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Claim task' }))
    expect(onClaim).toHaveBeenCalledOnce()
  })

  it('supports reassignment and locking for an assigned occurrence', async () => {
    const onAssign = vi.fn().mockResolvedValue(undefined)
    const onToggleLock = vi.fn().mockResolvedValue(undefined)
    render(<OccurrenceAssignmentControls canManage members={members} occurrence={occurrence({ assignee_user_id: members[0]!.userId, assignment_source: 'manual' })} onAssign={onAssign} onClaim={vi.fn()} onToggleLock={onToggleLock} />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Assigned to' }), members[1]!.userId)
    expect(onAssign).toHaveBeenCalledWith(members[1]!.userId, false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Lock assignment' }))
    expect(onToggleLock).toHaveBeenCalledWith(true)
  })

  it('does not expose assignment controls to guests', () => {
    render(<OccurrenceAssignmentControls canManage={false} members={members} occurrence={occurrence()} onAssign={vi.fn()} onClaim={vi.fn()} onToggleLock={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
