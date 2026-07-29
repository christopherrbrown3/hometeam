import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'

export function JoinHouseholdScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  async function join() {
    if (!token) return
    setIsJoining(true)
    setError(null)
    const { data: householdId, error: requestError } = await supabase.rpc('accept_household_join_link', { input_token: token })
    setIsJoining(false)
    if (requestError) {
      setError(requestError.message)
      return
    }
    localStorage.setItem('hometeam.household-id', householdId)
    navigate('/today', { replace: true })
  }

  return (
    <section className="page-stack flex min-h-[60dvh] items-center justify-center">
      <section className="w-full max-w-lg rounded-panel bg-surface p-6 text-center sm:p-8">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon name="users" size={26} /></span>
        <p className="mt-5 text-sm font-semibold text-brand">You’ve been invited</p>
        <h1 className="mt-1 text-2xl font-bold">Join this household</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">You’ll be added to the shared household and can start coordinating tasks right away.</p>
        {error && <p className="mt-4 rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
        <Button className="mt-6 w-full sm:w-auto" disabled={isJoining} onClick={() => void join()}>{isJoining ? 'Joining…' : 'Join household'}</Button>
      </section>
    </section>
  )
}
