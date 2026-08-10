import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { signOut } from '../auth/authService'
import { useSession } from '../auth/useSession'
import {
  getCurrentAccess,
  getSignupApprovalSetting,
  setAccessStatus,
  setSignupApprovalSetting,
} from './accessService'
import { Button } from '../../components/ui/Button'
import { HomeMark } from '../../components/ui/HomeMark'
import { Icon } from '../../components/ui/Icon'
import { FullPageState } from '../../components/ui/FullPageState'
import { consumeReturnLocation, peekReturnLocation } from '../auth/returnLocation'

const accessStatusMessage = {
  approved: 'You’re ready to join your household and get things done together.',
  pending: 'Your account is waiting for access. An administrator can allow it from account settings.',
  rejected: 'This account does not currently have access to HomeTeam.',
  suspended: 'This account’s HomeTeam access is paused.',
} as const

export function AccessStatusScreen({ administratorOnly = false }: Readonly<{ administratorOnly?: boolean }>) {
  const { session } = useSession()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [settingError, setSettingError] = useState<string | null>(null)
  const [isSavingSetting, setIsSavingSetting] = useState(false)
  const access = useQuery({
    queryFn: () => getCurrentAccess(supabase),
    queryKey: ['current-access', session?.user.id],
    refetchInterval: (query) => query.state.data?.status === 'approved' ? false : 30_000,
    retry: false,
  })
  const returnLocation = peekReturnLocation()
  const signupApproval = useQuery({
    enabled: access.data?.isAdministrator === true,
    queryFn: () => getSignupApprovalSetting(supabase),
    queryKey: ['signup-approval-setting'],
    retry: false,
  })
  const applicants = useQuery({
    enabled: access.data?.isAdministrator === true,
    queryKey: ['access-applicants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_access').select('user_id, status, requested_at').order('requested_at')
      if (error) throw error
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, display_name, username')
      if (profilesError) throw profilesError
      return data.map((row) => ({ ...row, profile: profiles.find((profile) => profile.user_id === row.user_id) }))
    },
  })

  if (access.isPending) return <FullPageState message="Checking your access…" />
  if (access.isError || !access.data) return <main className="flex min-h-dvh items-center justify-center bg-canvas p-6"><p className="rounded-control bg-danger/10 p-4 text-danger" role="alert">{access.error?.message ?? 'Access status is unavailable.'}</p></main>
  if (administratorOnly && !access.data.isAdministrator) return <main className="flex min-h-dvh items-center justify-center bg-canvas p-6"><section className="max-w-md rounded-panel bg-surface p-6 text-center"><Icon className="mx-auto text-brand" name="lock" size={28} /><h1 className="mt-3 text-xl font-bold">Administrator access required</h1><p className="mt-2 text-sm text-muted">You can view your own account status, but cannot manage other accounts.</p><Link className="mt-4 inline-block font-semibold text-brand underline" to="/access">View your account status</Link></section></main>

  async function decide(userId: string, status: 'approved' | 'rejected' | 'suspended') {
    await setAccessStatus(supabase, userId, status)
    await applicants.refetch()
    await access.refetch()
  }

  async function handleSignOut() {
    setSignOutError(null)
    const result = await signOut(supabase)
    if (!result.ok) setSignOutError(result.error.message)
  }

  async function changeSignupApproval(requireApproval: boolean) {
    setSettingError(null)
    setIsSavingSetting(true)

    try {
      await setSignupApprovalSetting(supabase, requireApproval)
      await signupApproval.refetch()
    } catch (reason) {
      setSettingError(reason instanceof Error ? reason.message : 'The signup setting could not be saved.')
    } finally {
      setIsSavingSetting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-canvas p-5 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-2.5" to="/today"><HomeMark className="text-brand" size={36} /><span className="font-bold tracking-tight">HomeTeam</span></Link>
          <Button onClick={() => void handleSignOut()} variant="secondary">Sign out</Button>
        </header>
        <section className="rounded-panel bg-sidebar p-6 text-white sm:p-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"><Icon name={access.data.status === 'approved' ? 'check' : 'clock'} /></span>
          <p className="mt-5 text-sm font-semibold text-sidebar-muted">HomeTeam account access</p>
          <h1 className="mt-1 text-2xl font-bold capitalize">Your access is {access.data.status}</h1>
          <p className="mt-2 max-w-xl text-sm text-sidebar-muted">{accessStatusMessage[access.data.status]}</p>
          {access.data.status === 'approved' && <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" onClick={() => consumeReturnLocation()} to={returnLocation}>Continue to HomeTeam <Icon name="chevron-right" size={17} /></Link>}
          {signOutError && <p className="mt-3 text-sm text-white" role="alert">{signOutError}</p>}
        </section>
        {access.data.isAdministrator && (
          <section className="settings-panel">
            <div className="border-b border-border p-5">
              <p className="text-sm font-semibold text-brand">Administration</p>
              <h2 className="mt-1 text-xl font-bold">Account access</h2>
              <p className="mt-1 text-sm text-muted">Allow, pause, or remove access for HomeTeam accounts.</p>
            </div>
            <div className="border-b border-border p-5">
              <div className="flex min-h-11 items-center justify-between gap-4">
                <span>
                  <span className="block font-semibold">Require approval for new signups</span>
                  <span className="mt-1 block text-sm text-muted" id="signup-approval-description">
                    {signupApproval.isPending
                      ? 'Loading the current signup policy…'
                      : signupApproval.isError
                        ? 'The current signup policy is unavailable.'
                        : signupApproval.data
                          ? 'New accounts wait here until an administrator allows access.'
                          : 'New accounts are activated immediately.'}
                  </span>
                </span>
                <button
                  aria-checked={signupApproval.data ?? false}
                  aria-describedby="signup-approval-description"
                  aria-label="Require approval for new signups"
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${signupApproval.data ? 'bg-brand' : 'bg-border'}`}
                  disabled={signupApproval.isPending || signupApproval.isError || isSavingSetting}
                  id="require-signup-approval"
                  onClick={() => void changeSignupApproval(!(signupApproval.data ?? false))}
                  role="switch"
                  type="button"
                >
                  <span aria-hidden="true" className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${signupApproval.data ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {signupApproval.isError && <p className="mt-2 text-sm text-danger" role="alert">{signupApproval.error.message}</p>}
              {settingError && <p className="mt-2 text-sm text-danger" role="alert">{settingError}</p>}
            </div>
            {applicants.isPending && <p className="p-5 text-sm text-muted">Loading accounts…</p>}
            <div>
              {applicants.data?.map((applicant) => (
                <article className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-b-0" key={applicant.user_id}>
                  <div><p className="font-semibold">{applicant.profile?.display_name ?? 'New member'}</p><p className="mt-0.5 text-sm text-muted">@{applicant.profile?.username ?? applicant.user_id} · <span className="capitalize">{applicant.status}</span></p></div>
                  <div className="flex flex-wrap gap-2">
                    {applicant.status !== 'approved' && <Button onClick={() => void decide(applicant.user_id, 'approved')} variant="primary">Allow access</Button>}
                    {applicant.status !== 'rejected' && <Button onClick={() => void decide(applicant.user_id, 'rejected')} variant="secondary">Remove access</Button>}
                    {applicant.status === 'approved' && <Button onClick={() => void decide(applicant.user_id, 'suspended')} variant="danger">Pause</Button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
