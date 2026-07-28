import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingEmail,
  consumeReturnLocation,
  getPendingEmail,
  saveReturnLocation,
  savePendingEmail,
} from './returnLocation'

describe('intended route storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('restores an invitation route once after sign-in', () => {
    saveReturnLocation('/invite/secure-token')

    expect(consumeReturnLocation()).toBe('/invite/secure-token')
    expect(consumeReturnLocation()).toBe('/today')
  })

  it('rejects external and unsafe destination values', () => {
    saveReturnLocation('https://attacker.example')

    expect(consumeReturnLocation()).toBe('/today')
  })

  it('keeps the pending email only for the current browser session', () => {
    savePendingEmail('person@example.com')
    expect(getPendingEmail()).toBe('person@example.com')

    clearPendingEmail()
    expect(getPendingEmail()).toBeNull()
  })
})
