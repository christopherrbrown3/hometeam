import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({ supabase: { auth } }))

import { AuthProvider } from './AuthProvider'
import { useSession } from './useSession'

function SessionProbe() {
  const { isLoading, session } = useSession()
  return <p>{isLoading ? 'loading' : session?.user.id ?? 'signed out'}</p>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'first-user' } } } })
    auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('hydrates the persisted session and clears protected cached data after sign-out', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['protected'], 'cached household data')
    let authListener: ((event: string, session: { user: { id: string } } | null) => void) | undefined
    auth.onAuthStateChange.mockImplementation((callback) => {
      authListener = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SessionProbe /></AuthProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('first-user')).toBeVisible()

    act(() => {
      authListener?.('SIGNED_OUT', null)
    })

    expect(await screen.findByText('signed out')).toBeVisible()
    expect(queryClient.getQueryData(['protected'])).toBeUndefined()
  })
})
