import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../features/auth/useSession'
import { AppShell } from './AppShell'

function renderShell(isAdministrator = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const userId = '00000000-0000-0000-0000-000000000101'
  queryClient.setQueryData(['current-access', userId], { isAdministrator, status: 'approved' })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ isLoading: false, session: { user: { id: userId } } as never }}>
        <MemoryRouter initialEntries={['/today']}>
          <AppShell>
            <h1>Today</h1>
          </AppShell>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  it('provides a skip link and accessible primary navigation', () => {
    renderShell()

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveTextContent(
      'TodayUpcomingTasksHistoryMore',
    )
  })

  it('shows the access-request view only to platform administrators', () => {
    renderShell(true)

    expect(screen.getByRole('link', { name: 'Access requests' })).toHaveAttribute('href', '/admin/access')
  })
})
