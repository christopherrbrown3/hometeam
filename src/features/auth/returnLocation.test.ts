import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeReturnLocation,
  peekReturnLocation,
  saveReturnLocation,
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

  it('keeps a household join route available through account approval', () => {
    saveReturnLocation('/join/secure-token')

    expect(peekReturnLocation()).toBe('/join/secure-token')
    expect(peekReturnLocation()).toBe('/join/secure-token')
    expect(consumeReturnLocation()).toBe('/join/secure-token')
  })

  it('rejects external and unsafe destination values', () => {
    saveReturnLocation('https://attacker.example')

    expect(consumeReturnLocation()).toBe('/today')
  })
})
