import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { requestEmailCode } from './authService'
import { AuthPageHeading } from './components/AuthPageHeading'
import { savePendingEmail } from './returnLocation'
import { loginSchema, type LoginValues } from './schemas'
import { zodResolver } from '@hookform/resolvers/zod'

export function OtpRequestScreen() {
  const navigate = useNavigate()
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<LoginValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginValues) {
    setRequestError(null)
    const result = await requestEmailCode(supabase, values.email)

    if (!result.ok) {
      setRequestError(result.error.message)
      return
    }

    savePendingEmail(result.data.email)
    void navigate('/verify')
  }

  return (
    <section aria-labelledby="auth-page-title" className="mx-auto max-w-md py-10">
      <AuthPageHeading title="Sign in">Enter your email and we’ll send you a six-digit sign-in code.</AuthPageHeading>
      <form aria-labelledby="auth-page-title" className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold" htmlFor="email">Email address</label>
          <input
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink"
            id="email"
            inputMode="email"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-2 text-sm text-danger" id="email-error">{errors.email.message}</p>}
        </div>
        {requestError && <p className="text-sm text-danger" role="alert">{requestError}</p>}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Sending code…' : 'Email me a code'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">HomeTeam is an approved-preview service. Signing in does not by itself grant access to household information.</p>
    </section>
  )
}
