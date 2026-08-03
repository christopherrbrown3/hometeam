import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssignmentFields } from './AssignmentFields'

const members = [
  { displayName: 'Alex', profileColor: 'blue' as const, username: 'alex', role: 'full_member' as const, userId: '00000000-0000-0000-0000-000000000101' },
  { displayName: 'Grandma', profileColor: 'green' as const, username: 'grandma', role: 'guest' as const, userId: '00000000-0000-0000-0000-000000000103' },
]

describe('AssignmentFields', () => {
  it('lets a full member create and reorder an accessible round-robin roster', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<AssignmentFields currentUserId={members[0]!.userId} members={members} onChange={onChange} values={{ assignmentMode: 'round_robin', fixedAssigneeId: '', rotationMemberIds: [members[0]!.userId, members[1]!.userId] }} />)

    expect(screen.getByRole('list', { name: 'Rotation order' })).toHaveTextContent('1. Alex')
    await user.click(screen.getByRole('button', { name: 'Move Grandma earlier' }))
    expect(onChange).toHaveBeenLastCalledWith({ rotationMemberIds: [members[1]!.userId, members[0]!.userId] })
  })
})
