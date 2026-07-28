import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { emailCodeSchema, emailSchema } from './schemas'

export type AuthServiceError = Readonly<{
  code: 'invalid_email' | 'invalid_code' | 'request_failed' | 'verification_failed'
  message: string
}>

export type AuthServiceResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: AuthServiceError }>

type HomeTeamSupabaseClient = SupabaseClient<Database>

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isRateLimitError(error: AuthError) {
  return /rate limit|security purposes/i.test(error.message)
}

export async function requestEmailCode(
  client: HomeTeamSupabaseClient,
  email: string,
): Promise<AuthServiceResult<{ email: string }>> {
  const parsedEmail = emailSchema.safeParse(email)

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_email',
        message: 'Enter a valid email address.',
      },
    }
  }

  const normalizedEmail = normalizeEmail(parsedEmail.data)
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return {
      ok: false,
      error: {
        code: 'request_failed',
        message: isRateLimitError(error)
          ? 'Please wait a moment before requesting another code.'
          : 'We could not send a sign-in code. Please try again.',
      },
    }
  }

  return { ok: true, data: { email: normalizedEmail } }
}

export async function verifyEmailCode(
  client: HomeTeamSupabaseClient,
  email: string,
  code: string,
): Promise<AuthServiceResult<{ session: Session }>> {
  const parsedEmail = emailSchema.safeParse(email)
  const parsedCode = emailCodeSchema.safeParse(code)

  if (!parsedEmail.success || !parsedCode.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_code',
        message: 'Enter the six-digit code from your email.',
      },
    }
  }

  const { data, error } = await client.auth.verifyOtp({
    email: normalizeEmail(parsedEmail.data),
    token: parsedCode.data,
    type: 'email',
  })

  if (error || !data.session) {
    return {
      ok: false,
      error: {
        code: 'verification_failed',
        message: 'That code is invalid or has expired. Request a new code and try again.',
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
        code: 'request_failed',
        message: 'We could not sign you out. Please try again.',
      },
    }
  }

  return { ok: true, data: undefined }
}
