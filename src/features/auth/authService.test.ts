import { describe, expect, it, vi } from 'vitest'
import { signInWithUsernamePassword, signUpWithUsernamePassword, usernameToAuthEmail } from './authService'

function createClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  }
}

describe('username and password authentication', () => {
  it('derives a non-routable Supabase Auth identifier from a normalized username', () => {
    expect(usernameToAuthEmail('  Home_User  ')).toBe('u-home_user@auth.hometeam.invalid')
  })

  it('signs in using the derived identifier without exposing it to the UI', async () => {
    const client = createClient()
    const session = { access_token: 'token' }
    client.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })

    const result = await signInWithUsernamePassword(client as never, '  Home_User  ', 'a-safe-password')

    expect(result).toEqual({ ok: true, data: { session } })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'u-home_user@auth.hometeam.invalid',
      password: 'a-safe-password',
    })
  })

  it('rejects invalid username or password values before calling Supabase', async () => {
    const client = createClient()

    const result = await signInWithUsernamePassword(client as never, 'No spaces', 'short')

    expect(result.ok).toBe(false)
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('creates an immediately signed-in account when email confirmation is disabled', async () => {
    const client = createClient()
    const session = { access_token: 'token' }
    client.auth.signUp.mockResolvedValue({ data: { session }, error: null })

    const result = await signUpWithUsernamePassword(client as never, 'new_member', 'a-safe-password')

    expect(result).toEqual({ ok: true, data: { session } })
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'u-new_member@auth.hometeam.invalid',
      password: 'a-safe-password',
    })
  })

  it('reports a configuration problem instead of pretending an unconfirmed account can sign in', async () => {
    const client = createClient()
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })

    const result = await signUpWithUsernamePassword(client as never, 'new_member', 'a-safe-password')

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'signup_requires_configuration' }) })
  })
})
