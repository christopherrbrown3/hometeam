import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'

export function InvitationScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  async function accept() { if (!token) return; setIsAccepting(true); setError(null); const { error: requestError } = await supabase.rpc('accept_household_invitation', { input_token: token }); setIsAccepting(false); if (requestError) { setError(requestError.message); return } navigate('/more', { replace: true }) }
  return <main className="mx-auto max-w-lg rounded-panel border border-border p-5"><p className="text-sm font-semibold text-brand">HomeTeam invitation</p><h1 className="mt-1 text-2xl font-bold">Join this household</h1><p className="mt-3 text-muted">Accepting will add the signed-in, approved account to this household.</p>{error && <p className="mt-3 text-danger" role="alert">{error}</p>}<Button className="mt-5" disabled={isAccepting} onClick={() => void accept()}>{isAccepting ? 'Joining…' : 'Accept invitation'}</Button></main>
}
