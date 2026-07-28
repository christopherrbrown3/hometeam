import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { HouseholdMember } from '../households/membershipService'
import type { Database } from '../../types/database'
import { ClaimAction } from './ClaimAction'

type Occurrence = Database['public']['Tables']['task_occurrences']['Row']

export type OccurrenceAssignmentControlsProps = Readonly<{
  members: readonly HouseholdMember[]
  canManage: boolean
  occurrence: Occurrence
  onAssign: (assigneeUserId: string, lock: boolean) => Promise<void>
  onClaim: () => Promise<void>
  onToggleLock: (locked: boolean) => Promise<void>
}>

export function OccurrenceAssignmentControls({ canManage, members, occurrence, onAssign, onClaim, onToggleLock }: OccurrenceAssignmentControlsProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function run(action: () => Promise<void>) { setError(null); setPending(true); try { await action() } catch (reason) { setError(reason instanceof Error ? reason.message : 'The assignment could not be updated.') } finally { setPending(false) } }
  if (!canManage) return null
  if (!occurrence.assignee_user_id) return <div className="space-y-2"><ClaimAction canClaim claiming={pending} onClaim={() => run(onClaim)} />{error && <p className="text-sm text-danger" role="alert">{error}</p>}</div>
  return <div className="space-y-2"><label className="block text-sm font-semibold">Assigned to<select aria-label="Assigned to" className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" disabled={pending} onChange={(event) => void run(() => onAssign(event.target.value, occurrence.assignment_locked))} value={occurrence.assignee_user_id}>{members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName} ({member.role === 'guest' ? 'Guest' : 'Member'})</option>)}</select></label><Button disabled={pending} onClick={() => void run(() => onToggleLock(!occurrence.assignment_locked))} type="button" variant="secondary">{occurrence.assignment_locked ? 'Unlock assignment' : 'Lock assignment'}</Button>{error && <p className="text-sm text-danger" role="alert">{error}</p>}</div>
}
