import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PwaStatusBanner } from './PwaStatusBanner'
import { PwaContext, type PwaStatus } from './pwaContext'

const baseStatus: PwaStatus = {
  applyUpdate: () => Promise.resolve(),
  dismissOfflineReady: vi.fn(),
  dismissUpdate: vi.fn(),
  isOfflineReady: false,
  isOnline: true,
  needsUpdate: false,
}

describe('PwaStatusBanner', () => {
  it('announces offline state and explains that task writes are not queued', () => {
    render(<PwaContext.Provider value={{ ...baseStatus, isOnline: false }}><PwaStatusBanner /></PwaContext.Provider>)

    expect(screen.getByRole('status')).toHaveTextContent('You’re offline')
    expect(screen.getByRole('status')).toHaveTextContent('never queues task actions')
  })

  it('offers an explicit refresh when a service-worker update is ready', () => {
    render(<PwaContext.Provider value={{ ...baseStatus, needsUpdate: true }}><PwaStatusBanner /></PwaContext.Provider>)

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Later' })).toBeEnabled()
  })
})
