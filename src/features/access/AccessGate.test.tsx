import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
const useSessionMock = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }))
vi.mock('../auth/useSession', () => ({ useSession: useSessionMock }))

import { AccessGate } from './AccessGate'

function renderGate(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AccessGate />}>
            <Route path="/today" element={<h1>Private household screen</h1>} />
          </Route>
          <Route path="/access" element={<h1>Access status</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccessGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionMock.mockReturnValue({ session: { user: { id: 'member-1' } } })
  })

  it('keeps a pending account out of product routes and clears protected cache data', async () => {
    rpc.mockResolvedValue({ data: [{ is_administrator: false, status: 'pending' }], error: null })
    const queryClient = new QueryClient()
    queryClient.setQueryData(['protected'], 'household data')

    renderGate(queryClient)

    expect(await screen.findByRole('heading', { name: 'Access status' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Private household screen' })).not.toBeInTheDocument()
    expect(queryClient.getQueryData(['protected'])).toBeUndefined()
  })

  it('mounts product routes only after authoritative approval', async () => {
    rpc.mockResolvedValue({ data: [{ is_administrator: false, status: 'approved' }], error: null })

    renderGate(new QueryClient())

    expect(await screen.findByRole('heading', { name: 'Private household screen' })).toBeVisible()
  })
})
