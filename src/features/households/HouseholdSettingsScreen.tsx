import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database'

type Household = Database['public']['Tables']['households']['Row']

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function HouseholdSettingsScreen() {
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(() => localStorage.getItem('hometeam.household-id'))
  const [error, setError] = useState<string | null>(null)
  const households = useQuery({
    queryKey: ['households'],
    queryFn: async () => {
      const { data, error: requestError } = await supabase.from('households').select('*').order('name')
      if (requestError) throw requestError
      return data
    },
  })
  const selectedHousehold = households.data?.find((household) => household.id === currentHouseholdId) ?? households.data?.[0] ?? null

  function selectHousehold(householdId: string) {
    localStorage.setItem('hometeam.household-id', householdId)
    setCurrentHouseholdId(householdId)
  }

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    const { data, error: requestError } = await supabase.rpc('create_household', {
      input_name: String(form.get('name') ?? ''), input_timezone: String(form.get('timezone') ?? browserTimezone()),
    })
    if (requestError || !data) { setError(requestError?.message ?? 'We could not create that household.'); return }
    await households.refetch()
    selectHousehold(data.id)
    event.currentTarget.reset()
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <section><p className="text-sm font-semibold text-brand">Your households</p><h1 className="text-2xl font-bold">Household settings</h1></section>
      {households.isPending && <p>Loading households…</p>}
      {households.data && households.data.length > 0 && <section className="rounded-panel border border-border p-5"><label className="block text-sm font-semibold" htmlFor="household">Current household</label><select className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3" id="household" onChange={(event) => selectHousehold(event.target.value)} value={selectedHousehold?.id ?? ''}>{households.data.map((household) => <option key={household.id} value={household.id}>{household.name} · {household.timezone}</option>)}</select>{selectedHousehold && <HouseholdManagement household={selectedHousehold} />}</section>}
      <form className="space-y-3 rounded-panel border border-border p-5" onSubmit={(event) => void createHousehold(event)}><h2 className="text-xl font-bold">Create a household</h2><label className="block text-sm font-semibold">Name<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" name="name" required /></label><label className="block text-sm font-semibold">Timezone<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" defaultValue={browserTimezone()} name="timezone" required /></label>{error && <p className="text-danger" role="alert">{error}</p>}<Button type="submit">Create household</Button></form>
    </main>
  )
}

function HouseholdManagement({ household }: Readonly<{ household: Household }>) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const memberships = useQuery({ queryKey: ['memberships', household.id], queryFn: async () => { const { data, error } = await supabase.from('household_memberships').select('user_id, role').eq('household_id', household.id); if (error) throw error; return data } })
  const categories = useQuery({ queryKey: ['categories', household.id], queryFn: async () => { const { data, error } = await supabase.from('categories').select('*').eq('household_id', household.id).order('name'); if (error) throw error; return data } })
  const invitations = useQuery({ queryKey: ['invitations', household.id], queryFn: async () => { const { data, error } = await supabase.rpc('list_household_invitations', { input_household_id: household.id }); if (error) throw error; return data } })
  async function invite(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setError(null); const { data, error: requestError } = await supabase.rpc('create_household_invitation', { input_email: String(form.get('email')), input_household_id: household.id, input_role: String(form.get('role')) as 'full_member' | 'guest' }); if (requestError || !data?.[0]) { setError(requestError?.message ?? 'We could not create an invitation.'); return } const link = `${window.location.origin}${window.location.pathname}#/invite/${data[0].token}`; await navigator.clipboard?.writeText(link); setMessage('Invitation link copied. Share it only with the invited email address.'); await invitations.refetch(); event.currentTarget.reset() }
  async function createCategory(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const { error: requestError } = await supabase.rpc('create_category', { input_household_id: household.id, input_name: String(form.get('category')) }); if (requestError) { setError(requestError.message); return } await categories.refetch(); event.currentTarget.reset() }
  async function revokeInvitation(invitationId: string) { const { error: requestError } = await supabase.rpc('revoke_household_invitation', { input_invitation_id: invitationId }); if (requestError) { setError(requestError.message); return } await invitations.refetch() }
  async function resendInvitation(email: string, role: 'full_member' | 'guest') { const { data, error: requestError } = await supabase.rpc('create_household_invitation', { input_email: email, input_household_id: household.id, input_role: role }); if (requestError || !data?.[0]) { setError(requestError?.message ?? 'We could not renew the invitation.'); return } const link = `${window.location.origin}${window.location.pathname}#/invite/${data[0].token}`; await navigator.clipboard?.writeText(link); setMessage('A new invitation link was copied and the previous link was revoked.'); await invitations.refetch() }
  return <div className="mt-6 space-y-6"><section><h2 className="text-lg font-bold">Members</h2><p className="mt-1 text-sm text-muted">{memberships.data?.length ?? 0} active member{memberships.data?.length === 1 ? '' : 's'} in this household.</p></section><section><h2 className="text-lg font-bold">Invite someone</h2><form className="mt-2 flex flex-wrap gap-2" onSubmit={(event) => void invite(event)}><input className="min-h-11 flex-1 rounded-control border border-border px-3" name="email" placeholder="name@example.com" required type="email"/><select className="min-h-11 rounded-control border border-border px-3" defaultValue="full_member" name="role"><option value="full_member">Full member</option><option value="guest">Guest</option></select><Button type="submit">Create link</Button></form>{message && <p className="mt-2 text-sm text-success">{message}</p>}{invitations.data?.map((invitation) => <article className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted" key={invitation.id}><span>{invitation.invited_email} · {invitation.role} · {invitation.status}</span>{invitation.status === 'active' && <span className="flex gap-2"><Button onClick={() => void resendInvitation(invitation.invited_email, invitation.role)} variant="secondary">Resend</Button><Button onClick={() => void revokeInvitation(invitation.id)} variant="danger">Revoke</Button></span>}</article>)}</section><section><h2 className="text-lg font-bold">Categories</h2><form className="mt-2 flex gap-2" onSubmit={(event) => void createCategory(event)}><input className="min-h-11 flex-1 rounded-control border border-border px-3" name="category" placeholder="e.g. Pets" required/><Button type="submit">Add</Button></form><div className="mt-2 flex flex-wrap gap-2">{categories.data?.map((category) => <span className="rounded-full bg-surface-strong px-3 py-1 text-sm" key={category.id}>{category.name}</span>)}</div></section>{error && <p className="text-danger" role="alert">{error}</p>}</div>
}
