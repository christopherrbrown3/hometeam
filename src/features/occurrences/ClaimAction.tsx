import { useState } from 'react'
import { Button } from '../../components/ui/Button'

export function ClaimAction({ canClaim, claiming = false, onClaim }: Readonly<{ canClaim: boolean; claiming?: boolean; onClaim: () => Promise<void> }>) {
  const [error, setError] = useState<string | null>(null)
  if (!canClaim) return null
  return <div className="space-y-2"><Button disabled={claiming} onClick={() => void onClaim().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to claim this task.'))} variant="secondary">{claiming ? 'Claiming…' : 'Claim task'}</Button>{error && <p className="text-sm text-danger" role="alert">{error}</p>}</div>
}
