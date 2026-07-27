import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('provides a skip link and accessible primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <AppShell>
          <h1>Today</h1>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveTextContent(
      'TodayUpcomingTasksHistoryMore',
    )
  })
})
