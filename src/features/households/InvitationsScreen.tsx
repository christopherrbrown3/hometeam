import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { createInvitation, listHouseholdInvitations, revokeInvitation } from './membershipService'

function invitationLink(token: string) {
  return `${window.location.origin}${window.location.pathname}#/invite/${token}`
}

export function InvitationsScreen({ householdId }: Readonly<{ householdId: string }>) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const invitations = useQuery({ queryKey: ['invitations', householdId], queryFn: () => listHouseholdInvitations(supabase, householdId) })

  async function copyNewInvitation(email: string, role: 'full_member' | 'guest') {
    setError(null)
    const invitation = await createInvitation(supabase, householdId, email, role)
    await navigator.clipboard?.writeText(invitationLink(invitation.token))
    setMessage('A private invitation link was copied. It is valid only for the invited email address.')
    await invitations.refetch()
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await copyNewInvitation(String(form.get('email')), String(form.get('role')) as 'full_member' | 'guest')
      event.currentTarget.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not create an invitation.')
    }
  }

  async function revoke(invitationId: string) {
    try {
      setError(null)
      await revokeInvitation(supabase, invitationId)
      await invitations.refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not revoke the invitation.')
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold">Invite someone</h2>
      <form className="mt-2 flex flex-wrap gap-2" onSubmit={(event) => void invite(event)}>
        <input aria-label="Invitation email" className="min-h-11 flex-1 rounded-control border border-border px-3" name="email" placeholder="name@example.com" required type="email" />
        <select aria-label="Member role" className="min-h-11 rounded-control border border-border px-3" defaultValue="full_member" name="role"><option value="full_member">Full member</option><option value="guest">Guest</option></select>
        <Button type="submit">Create link</Button>
      </form>
      {message && <p className="mt-2 text-sm text-success" role="status">{message}</p>}
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
      {invitations.isPending && <p className="mt-2 text-sm text-muted">Loading invitations…</p>}
      <ul className="mt-3 space-y-2" aria-label="Household invitations">
        {invitations.data?.map((invitation) => (
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-strong px-3 py-2 text-sm" key={invitation.id}>
            <span>{invitation.invited_email} · {invitation.role.replace('_', ' ')} · {invitation.status}</span>
            {invitation.status === 'active' && <span className="flex gap-2"><Button onClick={() => void copyNewInvitation(invitation.invited_email, invitation.role)} variant="secondary">Resend</Button><Button onClick={() => void revoke(invitation.id)} variant="danger">Revoke</Button></span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
