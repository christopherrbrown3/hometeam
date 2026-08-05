import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TodayFilters } from './TodayFilters'

describe('TodayFilters', () => {
  it('keeps status definitions available on hover without an explanatory callout', () => {
    render(<TodayFilters onStatus={vi.fn()} status="all" />)

    expect(screen.queryByText(/means its scheduled time has passed/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overdue' })).toHaveAttribute('title', 'Scheduled time has passed.')
    expect(screen.getByRole('button', { name: 'Due now' })).toHaveAttribute('title', 'Currently within its scheduled time.')
    expect(screen.getByRole('button', { name: 'Later today' })).toHaveAttribute('title', 'Has not started yet.')
  })
})
