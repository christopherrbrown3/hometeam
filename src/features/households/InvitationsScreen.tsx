import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { createHouseholdJoinLink, getHouseholdJoinLinkStatus, revokeHouseholdJoinLink } from './membershipService'
import { Icon } from '../../components/ui/Icon'

function invitationLink(token: string) {
  return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(token)}`
}

export function InvitationsScreen({ householdId }: Readonly<{ householdId: string }>) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const linkStatus = useQuery({ queryKey: ['household-join-link', householdId], queryFn: () => getHouseholdJoinLinkStatus(supabase, householdId) })

  async function copyLink(url: string) {
    if (!navigator.clipboard) {
      setMessage('The link is ready. Select it and copy it manually.')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Join link copied.')
    } catch {
      setMessage('The link is ready. Select it and copy it manually.')
    }
  }

  async function shareLink(url: string) {
    try {
      await navigator.share({
        title: 'Join my household on HomeTeam',
        text: 'Join our household on HomeTeam to coordinate tasks together.',
        url,
      })
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError('Sharing is unavailable right now. Copy the link instead.')
      }
    }
  }

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      setError(null)
      setMessage(null)
      const created = await createHouseholdJoinLink(supabase, householdId, String(form.get('role')) as 'full_member' | 'guest')
      const url = invitationLink(created.token)
      setShareUrl(url)
      await linkStatus.refetch()
      await copyLink(url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not create a join link.')
    }
  }

  async function revoke() {
    if (!linkStatus.data) return
    try {
      setError(null)
      setMessage(null)
      await revokeHouseholdJoinLink(supabase, linkStatus.data.join_link_id)
      setShareUrl(null)
      setMessage('The join link has been turned off.')
      await linkStatus.refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not turn off the join link.')
    }
  }

  return (
    <section>
      <h2 className="sr-only">Invite someone</h2>
      <p className="text-sm text-muted">Create one link to share by text, email, or any messaging app. It works for new and existing accounts.</p>
      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(event) => void createLink(event)}>
        <label className="block text-sm font-semibold">
          People who join can
          <select aria-label="Member role" className="mt-1 min-h-11 w-full rounded-control border px-3" defaultValue="full_member" name="role">
            <option value="full_member">Manage tasks and household settings</option>
            <option value="guest">Only see tasks assigned to them</option>
          </select>
        </label>
        <Button className="self-end" type="submit"><Icon name="plus" size={17} />{linkStatus.data ? 'Replace & copy link' : 'Create & copy link'}</Button>
      </form>
      <p className="mt-2 text-xs leading-relaxed text-muted">For safety, links expire after 7 days, can be used up to 12 times, and can be turned off at any time. Replacing a link disables the old one.</p>
      {shareUrl && (
        <div className="mt-4 rounded-control bg-canvas p-3">
          <div className="flex items-center gap-2">
            <img alt="" className="h-8 w-8 rounded-control" src="favicon.svg" />
            <div>
              <p className="text-xs font-semibold text-ink">Ready to share</p>
              <p className="text-xs text-muted">Invite someone to join this household.</p>
            </div>
          </div>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input className="min-h-11 min-w-0 flex-1 rounded-control border bg-surface px-3 text-sm" onFocus={(event) => event.currentTarget.select()} readOnly value={shareUrl} />
            <Button onClick={() => void copyLink(shareUrl)} variant="secondary">Copy</Button>
            {typeof navigator.share === 'function' && <Button onClick={() => void shareLink(shareUrl)} variant="secondary">Share</Button>}
          </div>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-success" role="status">{message}</p>}
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
      {linkStatus.isError && <p className="mt-2 text-sm text-danger" role="alert">{linkStatus.error.message}</p>}
      {linkStatus.isPending && <p className="mt-3 text-sm text-muted">Checking for an active link…</p>}
      {linkStatus.data && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-canvas px-3 py-2.5 text-sm">
          <span><strong>Active link</strong> · {linkStatus.data.use_count} of {linkStatus.data.max_uses} joins used · expires {new Date(linkStatus.data.expires_at).toLocaleDateString()}</span>
          <Button onClick={() => void revoke()} variant="danger">Turn off</Button>
        </div>
      )}
    </section>
  )
}
