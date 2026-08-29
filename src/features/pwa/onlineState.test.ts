import { describe, expect, it } from 'vitest'
import { OfflineMutationError, offlineMutationMessage, requireOnline } from './onlineState'

describe('online mutation guard', () => {
  it('rejects an offline task write with the no-replay explanation', () => {
    const original = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })

    expect(requireOnline).toThrow(OfflineMutationError)
    expect(requireOnline).toThrow(offlineMutationMessage)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: original })
  })

  it('allows a task write to continue online', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    expect(requireOnline).not.toThrow()
  })
})
