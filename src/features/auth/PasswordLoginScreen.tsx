import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { signInWithUsernamePassword } from './authService'
import { AuthPageHeading } from './components/AuthPageHeading'
import { consumeReturnLocation } from './returnLocation'
import { loginSchema, type LoginValues } from './schemas'

export function PasswordLoginScreen() {
  const navigate = useNavigate()
  const [signInError, setSignInError] = useState<string | null>(null)
  const { formState: { errors, isSubmitting }, register, handleSubmit } = useForm<LoginValues>({
    defaultValues: { username: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginValues) {
    setSignInError(null)
    const result = await signInWithUsernamePassword(supabase, values.username, values.password)
    if (!result.ok) {
      setSignInError(result.error.message)
      return
    }
    void navigate(consumeReturnLocation(), { replace: true })
  }

  return (
    <section aria-labelledby="auth-page-title" className="mx-auto max-w-md py-10">
      <AuthPageHeading title="Sign in">Use your HomeTeam username and password.</AuthPageHeading>
      <form aria-labelledby="auth-page-title" className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold" htmlFor="username">Username</label>
          <input aria-describedby={errors.username ? 'username-error' : undefined} aria-invalid={Boolean(errors.username)} autoCapitalize="none" autoComplete="username" className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink" id="username" {...register('username')} />
          {errors.username && <p className="mt-2 text-sm text-danger" id="username-error">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="password">Password</label>
          <input aria-describedby={errors.password ? 'password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink" id="password" type="password" {...register('password')} />
          {errors.password && <p className="mt-2 text-sm text-danger" id="password-error">{errors.password.message}</p>}
        </div>
        {signInError && <p className="text-sm text-danger" role="alert">{signInError}</p>}
        <Button className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="mt-6 text-sm text-muted">Need an account? <Link className="font-semibold text-brand underline" to="/register">Create one</Link>.</p>
      <p className="mt-3 text-sm text-muted">HomeTeam is an approved-preview service. Signing in does not by itself grant access to household information.</p>
    </section>
  )
}
