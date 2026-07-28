import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClaimAction } from './ClaimAction'

describe('ClaimAction', () => {
  it('hides a forbidden guest action and reports a rejected claim', async () => {
    const { rerender } = render(<ClaimAction canClaim={false} onClaim={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Claim task' })).not.toBeInTheDocument()

    rerender(<ClaimAction canClaim onClaim={async () => { throw new Error('This occurrence was already claimed.') }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Claim task' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already claimed')
  })
})
