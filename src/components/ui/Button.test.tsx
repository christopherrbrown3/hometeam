import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('preserves native disabled behavior', () => {
    render(<Button disabled>Complete task</Button>)

    expect(screen.getByRole('button', { name: 'Complete task' })).toBeDisabled()
  })
})
