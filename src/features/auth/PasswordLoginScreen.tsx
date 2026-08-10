import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'
import { signInWithUsernamePassword } from './authService'
import { AuthPageHeading } from './components/AuthPageHeading'
import { peekReturnLocation } from './returnLocation'
import { loginSchema, type LoginValues } from './schemas'
import { LoginPortfolioFrame } from './components/LoginPortfolioFrame'

export function PasswordLoginScreen() {
  const [signInError, setSignInError] = useState<string | null>(null)
  const joiningHousehold = peekReturnLocation().startsWith('/join/')
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
  }

  return (
    <LoginPortfolioFrame>
      <AuthPageHeading showMobileBrand={false} title="Sign in">{joiningHousehold ? 'Sign in to continue to the household invitation.' : 'Use your HomeTeam username and password.'}</AuthPageHeading>
      <form aria-labelledby="auth-page-title" className="mt-7 space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold" htmlFor="username">Username</label>
          <input aria-describedby={errors.username ? 'username-error' : undefined} aria-invalid={Boolean(errors.username)} autoCapitalize="none" autoComplete="username" className="mt-2 min-h-12 w-full rounded-control border px-3.5 text-ink" id="username" placeholder="Your username" {...register('username')} />
          {errors.username && <p className="mt-2 text-sm text-danger" id="username-error">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="password">Password</label>
          <input aria-describedby={errors.password ? 'password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="mt-2 min-h-12 w-full rounded-control border px-3.5 text-ink" id="password" placeholder="Your password" type="password" {...register('password')} />
          {errors.password && <p className="mt-2 text-sm text-danger" id="password-error">{errors.password.message}</p>}
        </div>
        {signInError && <p className="text-sm text-danger" role="alert">{signInError}</p>}
        <Button className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">Need an account? <Link className="font-semibold text-brand underline underline-offset-2" to="/register">Create one</Link>.</p>
      <p className="login-preview-notice"><Icon name="lock" size={16} weight="duotone" /> <span><strong>Private preview</strong> Create an account to request access to HomeTeam.</span></p>
    </LoginPortfolioFrame>
  )
}
