import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeReturnLocation,
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

  it('rejects external and unsafe destination values', () => {
    saveReturnLocation('https://attacker.example')

    expect(consumeReturnLocation()).toBe('/today')
  })
})
