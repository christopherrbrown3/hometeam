import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { signOut } from '../auth/authService'
import { useSession } from '../auth/useSession'
import { getCurrentAccess, setAccessStatus } from './accessService'
import { Button } from '../../components/ui/Button'

export function AccessStatusScreen({ administratorOnly = false }: Readonly<{ administratorOnly?: boolean }>) {
  const { session } = useSession()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const access = useQuery({ queryKey: ['current-access', session?.user.id], queryFn: () => getCurrentAccess(supabase), retry: false })
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

  if (access.isPending) return <p>Checking your access…</p>
  if (access.isError || !access.data) return <p role="alert">{access.error?.message ?? 'Access status is unavailable.'}</p>
  if (administratorOnly && !access.data.isAdministrator) return <main><h1>Administrator access required</h1><p>You can view your own preview-access status, but cannot review other accounts.</p><Link to="/access">View your access status</Link></main>

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
    <main className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-panel border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-brand">HomeTeam preview</p>
        <h1 className="mt-1 text-2xl font-bold">Your access is {access.data.status}</h1>
        {access.data.status === 'approved' && <Link className="mt-4 inline-block font-semibold text-brand underline" to="/today">Continue to HomeTeam</Link>}
        <Button className="ml-4" onClick={() => void handleSignOut()} variant="secondary">Sign out</Button>
        {signOutError && <p className="mt-3 text-danger" role="alert">{signOutError}</p>}
      </section>
      {access.data.isAdministrator && (
        <section className="space-y-3 rounded-panel border border-border p-5">
          <h2 className="text-xl font-bold">Access requests</h2>
          {applicants.isPending && <p>Loading requests…</p>}
          {applicants.data?.map((applicant) => (
            <article className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3" key={applicant.user_id}>
              <div><p className="font-semibold">{applicant.profile?.display_name ?? 'New member'}</p><p className="text-sm text-muted">@{applicant.profile?.username ?? applicant.user_id} · {applicant.status}</p></div>
              <div className="flex gap-2">
                {applicant.status !== 'approved' && <Button onClick={() => void decide(applicant.user_id, 'approved')} variant="primary">Approve</Button>}
                {applicant.status !== 'rejected' && <Button onClick={() => void decide(applicant.user_id, 'rejected')} variant="secondary">Reject</Button>}
                {applicant.status === 'approved' && <Button onClick={() => void decide(applicant.user_id, 'suspended')} variant="danger">Pause</Button>}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
