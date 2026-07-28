import { describe, expect, it, vi } from 'vitest'
import { requestEmailCode, verifyEmailCode } from './authService'

function createClient() {
  return {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  }
}

describe('authService', () => {
  it('normalizes an email before requesting a six-digit code', async () => {
    const client = createClient()
    client.auth.signInWithOtp.mockResolvedValue({ error: null })

    const result = await requestEmailCode(client as never, '  Person@Example.com ')

    expect(result).toEqual({ ok: true, data: { email: 'person@example.com' } })
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      options: { shouldCreateUser: true },
    })
  })

  it('rejects a malformed email without sending an auth request', async () => {
    const client = createClient()

    const result = await requestEmailCode(client as never, 'not-an-email')

    expect(result.ok).toBe(false)
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('verifies only six-digit codes and returns the session', async () => {
    const client = createClient()
    const session = { access_token: 'token', user: { id: 'person-id' } }
    client.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null })

    const result = await verifyEmailCode(client as never, 'person@example.com', '123456')

    expect(result).toEqual({ ok: true, data: { session } })
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      token: '123456',
      type: 'email',
    })
  })

  it('returns a safe error for an expired or invalid code', async () => {
    const client = createClient()
    client.auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'bad token' } })

    const result = await verifyEmailCode(client as never, 'person@example.com', '123456')

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'verification_failed',
        message: 'That code is invalid or has expired. Request a new code and try again.',
      },
    })
  })
})
