import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { loginSchema } from './schemas'

export type AuthServiceError = Readonly<{
  code: 'invalid_credentials' | 'sign_in_failed' | 'signup_failed' | 'signup_requires_configuration'
  message: string
}>

export type AuthServiceResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AuthServiceError }>

type HomeTeamSupabaseClient = SupabaseClient<Database>

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function usernameToAuthEmail(username: string) {
  return `u-${normalizeUsername(username)}@auth.hometeam.invalid`
}

function isInvalidCredentialError(error: AuthError) {
  return /invalid login credentials|invalid credentials/i.test(error.message)
}

export async function signInWithUsernamePassword(
  client: HomeTeamSupabaseClient,
  username: string,
  password: string,
): Promise<AuthServiceResult<{ session: Session }>> {
  const parsed = loginSchema.safeParse({ username, password })

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_credentials',
        message: 'Enter a valid username and password.',
      },
    }
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(parsed.data.username),
    password: parsed.data.password,
  })

  if (error || !data.session) {
    return {
      ok: false,
      error: {
        code: 'sign_in_failed',
        message: error && isInvalidCredentialError(error)
          ? 'Invalid username or password.'
          : 'We could not sign you in. Please try again.',
      },
    }
  }

  return { ok: true, data: { session: data.session } }
}

export async function signUpWithUsernamePassword(
  client: HomeTeamSupabaseClient,
  username: string,
  password: string,
): Promise<AuthServiceResult<{ session: Session }>> {
  const parsed = loginSchema.safeParse({ username, password })

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_credentials',
        message: 'Enter a valid username and password.',
      },
    }
  }

  const { data, error } = await client.auth.signUp({
    email: usernameToAuthEmail(parsed.data.username),
    password: parsed.data.password,
  })

  if (error) {
    return {
      ok: false,
      error: {
        code: 'signup_failed',
        message: 'We could not create that account. Try another username or try again later.',
      },
    }
  }

  if (!data.session) {
    return {
      ok: false,
      error: {
        code: 'signup_requires_configuration',
        message: 'Account creation is not ready yet. Please ask an administrator to disable email confirmation in Supabase Auth.',
      },
    }
  }

  return { ok: true, data: { session: data.session } }
}

export async function signOut(client: HomeTeamSupabaseClient): Promise<AuthServiceResult<undefined>> {
  const { error } = await client.auth.signOut()

  if (error) {
    return {
      ok: false,
      error: {
        code: 'sign_in_failed',
        message: 'We could not sign you out. Please try again.',
      },
    }
  }

  return { ok: true, data: undefined }
}
