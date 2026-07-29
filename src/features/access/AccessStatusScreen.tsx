import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { signOut } from '../auth/authService'
import { useSession } from '../auth/useSession'
import { getCurrentAccess, setAccessStatus } from './accessService'
import { Button } from '../../components/ui/Button'
import { HomeMark } from '../../components/ui/HomeMark'
import { Icon } from '../../components/ui/Icon'
import { FullPageState } from '../../components/ui/FullPageState'
import { consumeReturnLocation, peekReturnLocation } from '../auth/returnLocation'

export function AccessStatusScreen({ administratorOnly = false }: Readonly<{ administratorOnly?: boolean }>) {
  const { session } = useSession()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const access = useQuery({
    queryFn: () => getCurrentAccess(supabase),
    queryKey: ['current-access', session?.user.id],
    refetchInterval: (query) => query.state.data?.status === 'approved' ? false : 30_000,
    retry: false,
  })
  const returnLocation = peekReturnLocation()
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
  if (administratorOnly && !access.data.isAdministrator) return <main className="flex min-h-dvh items-center justify-center bg-canvas p-6"><section className="max-w-md rounded-panel bg-surface p-6 text-center"><Icon className="mx-auto text-brand" name="lock" size={28} /><h1 className="mt-3 text-xl font-bold">Administrator access required</h1><p className="mt-2 text-sm text-muted">You can view your own preview-access status, but cannot review other accounts.</p><Link className="mt-4 inline-block font-semibold text-brand underline" to="/access">View your access status</Link></section></main>

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

  return (
    <main className="min-h-dvh bg-canvas p-5 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-2.5" to="/today"><HomeMark className="text-brand" size={36} /><span className="font-bold tracking-tight">HomeTeam</span></Link>
          <Button onClick={() => void handleSignOut()} variant="secondary">Sign out</Button>
        </header>
        <section className="rounded-panel bg-sidebar p-6 text-white sm:p-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"><Icon name={access.data.status === 'approved' ? 'check' : 'clock'} /></span>
          <p className="mt-5 text-sm font-semibold text-sidebar-muted">HomeTeam private preview</p>
          <h1 className="mt-1 text-2xl font-bold capitalize">Your access is {access.data.status}</h1>
          <p className="mt-2 max-w-xl text-sm text-sidebar-muted">{access.data.status === 'approved' ? 'You’re ready to join your household and get things done together.' : 'An administrator will review your account. You can return here to check the latest status.'}</p>
          {access.data.status === 'approved' && <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" onClick={() => consumeReturnLocation()} to={returnLocation}>Continue to HomeTeam <Icon name="chevron-right" size={17} /></Link>}
          {signOutError && <p className="mt-3 text-sm text-white" role="alert">{signOutError}</p>}
        </section>
        {access.data.isAdministrator && (
          <section className="settings-panel">
            <div className="border-b border-border p-5">
              <p className="text-sm font-semibold text-brand">Administration</p>
              <h2 className="mt-1 text-xl font-bold">Access requests</h2>
              <p className="mt-1 text-sm text-muted">Review people waiting to join the preview.</p>
            </div>
            {applicants.isPending && <p className="p-5 text-sm text-muted">Loading requests…</p>}
            <div>
              {applicants.data?.map((applicant) => (
                <article className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-b-0" key={applicant.user_id}>
                  <div><p className="font-semibold">{applicant.profile?.display_name ?? 'New member'}</p><p className="mt-0.5 text-sm text-muted">@{applicant.profile?.username ?? applicant.user_id} · <span className="capitalize">{applicant.status}</span></p></div>
                  <div className="flex flex-wrap gap-2">
                    {applicant.status !== 'approved' && <Button onClick={() => void decide(applicant.user_id, 'approved')} variant="primary">Approve</Button>}
                    {applicant.status !== 'rejected' && <Button onClick={() => void decide(applicant.user_id, 'rejected')} variant="secondary">Reject</Button>}
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
