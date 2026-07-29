import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'

export function InvitationScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  async function accept() { if (!token) return; setIsAccepting(true); setError(null); const { error: requestError } = await supabase.rpc('accept_household_invitation', { input_token: token }); setIsAccepting(false); if (requestError) { setError(requestError.message); return } navigate('/more', { replace: true }) }
  return (
    <main className="page-stack flex min-h-[60dvh] items-center justify-center">
      <section className="w-full max-w-lg rounded-panel bg-surface p-6 text-center sm:p-8">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon name="users" size={26} /></span>
        <p className="mt-5 text-sm font-semibold text-brand">HomeTeam invitation</p>
        <h1 className="mt-1 text-2xl font-bold">Join this household</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">Accepting adds your approved account to this household’s shared task list.</p>
        {error && <p className="mt-4 rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
        <Button className="mt-6 w-full sm:w-auto" disabled={isAccepting} onClick={() => void accept()}>{isAccepting ? 'Joining…' : 'Accept invitation'}</Button>
      </section>
    </main>
  )
}
