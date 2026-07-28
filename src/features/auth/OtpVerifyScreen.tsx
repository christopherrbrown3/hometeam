import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { requestEmailCode, verifyEmailCode } from './authService'
import { AuthPageHeading } from './components/AuthPageHeading'
import { clearPendingEmail, consumeReturnLocation, getPendingEmail } from './returnLocation'
import { verifySchema, type VerifyValues } from './schemas'
import { zodResolver } from '@hookform/resolvers/zod'

export function OtpVerifyScreen() {
  const email = getPendingEmail()
  const navigate = useNavigate()
  const [requestError, setRequestError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<VerifyValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(verifySchema),
  })

  async function onSubmit(values: VerifyValues) {
    if (!email) {
      return
    }

    setRequestError(null)
    const result = await verifyEmailCode(supabase, email, values.code)

    if (!result.ok) {
      setRequestError(result.error.message)
      return
    }

    clearPendingEmail()
    void navigate(consumeReturnLocation(), { replace: true })
  }

  async function resendCode() {
    if (!email) {
      return
    }

    setRequestError(null)
    setResent(false)
    const result = await requestEmailCode(supabase, email)

    if (!result.ok) {
      setRequestError(result.error.message)
      return
    }

    setResent(true)
  }

  if (!email) {
    return (
      <section aria-labelledby="verify-title" className="mx-auto max-w-md py-10">
        <h1 className="text-3xl font-bold tracking-tight" id="verify-title">Verify your email</h1>
        <p className="mt-3 text-muted">Start a new sign-in request so we know where to send your code.</p>
        <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand underline" to="/login">Back to sign in</Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="verify-title" className="mx-auto max-w-md py-10">
      <AuthPageHeading title="Check your email">Enter the six-digit code sent to <span className="font-semibold text-ink">{email}</span>.</AuthPageHeading>
      <form aria-labelledby="auth-page-title" className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold" htmlFor="code">Sign-in code</label>
          <input
            aria-describedby={errors.code ? 'code-error' : undefined}
            aria-invalid={Boolean(errors.code)}
            autoComplete="one-time-code"
            className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 font-mono text-xl tracking-[0.35em] text-ink"
            id="code"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            type="text"
            {...register('code')}
          />
          {errors.code && <p className="mt-2 text-sm text-danger" id="code-error">{errors.code.message}</p>}
        </div>
        {requestError && <p className="text-sm text-danger" role="alert">{requestError}</p>}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </form>
      <div className="mt-6 text-sm">
        <Button className="px-0 underline" disabled={isSubmitting} onClick={() => void resendCode()} variant="secondary">Send another code</Button>
        {resent && <p className="mt-2 text-success" role="status">A new code is on its way.</p>}
      </div>
      <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand underline" to="/login">Use a different email</Link>
    </section>
  )
}
