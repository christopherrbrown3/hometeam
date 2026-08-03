import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskForm } from './TaskForm'

const creatorId = '00000000-0000-0000-0000-000000000101'

describe('TaskForm defaults', () => {
  it('defaults assignment to the creator and uses one-time date language', () => {
    render(
      <TaskForm
        categories={[]}
        currentUserId={creatorId}
        members={[{ displayName: 'Alex', profileColor: 'blue', role: 'full_member', userId: creatorId, username: 'alex' }]}
        onSave={vi.fn()}
        timeZone="America/New_York"
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Who should do it?' })).toHaveValue(`member:${creatorId}`)
    expect(screen.getByLabelText('Due date')).toBeVisible()
    expect(screen.queryByText('First due date')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add an end time/ })).toBeVisible()

    fireEvent.input(screen.getByLabelText('Due date'), { target: { value: '2026-07-30' } })
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-07-30')
  })

  it('keeps the same duration when the start time changes', () => {
    render(
      <TaskForm
        categories={[]}
        currentUserId={creatorId}
        members={[{ displayName: 'Alex', profileColor: 'blue', role: 'full_member', userId: creatorId, username: 'alex' }]}
        onSave={vi.fn()}
        timeZone="America/New_York"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Add an end time/ }))
    const start = screen.getByLabelText('Time')
    fireEvent.input(start, { target: { value: '10:15' } })

    expect(screen.getByLabelText('Ends')).toHaveValue('10:45')
  })
})
