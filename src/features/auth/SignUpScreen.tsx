import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { signUpWithUsernamePassword } from './authService'
import { AuthPageHeading } from './components/AuthPageHeading'
import { consumeReturnLocation } from './returnLocation'
import { signupSchema, type SignUpValues } from './schemas'

export function SignUpScreen() {
  const navigate = useNavigate()
  const [signupError, setSignupError] = useState<string | null>(null)
  const { formState: { errors, isSubmitting }, register, handleSubmit } = useForm<SignUpValues>({
    defaultValues: { username: '', password: '', confirmPassword: '' },
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignUpValues) {
    setSignupError(null)
    const result = await signUpWithUsernamePassword(supabase, values.username, values.password)
    if (!result.ok) {
      setSignupError(result.error.message)
      return
    }
    void navigate(consumeReturnLocation(), { replace: true })
  }

  return (
    <section aria-labelledby="auth-page-title" className="mx-auto max-w-md py-10">
      <AuthPageHeading title="Create your account">Choose a username and a password. You can request access after signing in.</AuthPageHeading>
      <form aria-labelledby="auth-page-title" className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold" htmlFor="username">Username</label>
          <input aria-describedby={errors.username ? 'username-error' : undefined} aria-invalid={Boolean(errors.username)} autoCapitalize="none" autoComplete="username" className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink" id="username" {...register('username')} />
          <p className="mt-2 text-sm text-muted">3–32 lowercase letters, numbers, hyphens, or underscores.</p>
          {errors.username && <p className="mt-2 text-sm text-danger" id="username-error">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="password">Password</label>
          <input aria-describedby={errors.password ? 'password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink" id="password" type="password" {...register('password')} />
          {errors.password && <p className="mt-2 text-sm text-danger" id="password-error">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="confirm-password">Confirm password</label>
          <input aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined} aria-invalid={Boolean(errors.confirmPassword)} autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-ink" id="confirm-password" type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="mt-2 text-sm text-danger" id="confirm-password-error">{errors.confirmPassword.message}</p>}
        </div>
        {signupError && <p className="text-sm text-danger" role="alert">{signupError}</p>}
        <Button className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-sm text-muted">Already have an account? <Link className="font-semibold text-brand underline" to="/login">Sign in</Link>.</p>
    </section>
  )
}
