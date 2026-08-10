import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const from = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({ supabase: { from, rpc } }))
vi.mock('../auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'administrator-1' } } }),
}))

import { AccessStatusScreen } from './AccessStatusScreen'

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccessStatusScreen administratorOnly />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccessStatusScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let requireApproval = false

    rpc.mockImplementation((name: string, args?: { input_require_signup_approval?: boolean }) => {
      if (name === 'get_current_access') {
        return Promise.resolve({ data: [{ is_administrator: true, status: 'approved' }], error: null })
      }

      if (name === 'get_signup_approval_setting') {
        return Promise.resolve({ data: [{ require_signup_approval: requireApproval }], error: null })
      }

      if (name === 'set_signup_approval_setting') {
        requireApproval = args?.input_require_signup_approval ?? false
        return Promise.resolve({ data: requireApproval, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    })

    from.mockImplementation((table: string) => {
      if (table === 'platform_access') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }

      return {
        select: () => Promise.resolve({ data: [], error: null }),
      }
    })
  })

  it('lets an administrator require approval for future signups', async () => {
    const user = userEvent.setup()
    renderScreen()

    const setting = await screen.findByRole('switch', { name: /Require approval for new signups/ })
    expect(setting).not.toBeChecked()
    expect(await screen.findByText('New accounts are activated immediately.')).toBeVisible()
    expect(setting).toBeEnabled()

    await user.click(setting)

    await waitFor(() => expect(setting).toBeChecked())
    expect(rpc).toHaveBeenCalledWith('set_signup_approval_setting', {
      input_require_signup_approval: true,
    })
    expect(screen.getByText('New accounts wait here until an administrator allows access.')).toBeVisible()
  })
})
