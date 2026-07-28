import type { HouseholdMember } from '../households/membershipService'
import type { TaskFormValues } from './taskFormSchema'

type AssignmentFieldsProps = Readonly<{
  members: readonly HouseholdMember[]
  onChange: (change: Partial<TaskFormValues>) => void
  values: Pick<TaskFormValues, 'assignmentMode' | 'fixedAssigneeId' | 'rotationMemberIds'>
}>

export function AssignmentFields({ members, onChange, values }: AssignmentFieldsProps) {
  const selected = values.rotationMemberIds
  function move(userId: string, direction: -1 | 1) {
    const index = selected.indexOf(userId); const destination = index + direction
    if (destination < 0 || destination >= selected.length) return
    const next = [...selected]; [next[index], next[destination]] = [next[destination]!, next[index]!]
    onChange({ rotationMemberIds: next })
  }
  function toggle(userId: string, included: boolean) { onChange({ rotationMemberIds: included ? [...selected, userId] : selected.filter((memberId) => memberId !== userId) }) }
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">Assignment</legend><label className="block text-sm font-semibold">Mode<select className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onChange({ assignmentMode: event.target.value as TaskFormValues['assignmentMode'], fixedAssigneeId: '', rotationMemberIds: event.target.value === 'round_robin' ? selected : [] })} value={values.assignmentMode}><option value="unassigned">Unassigned</option><option value="fixed">Fixed person</option><option value="round_robin">Round robin</option></select></label>{values.assignmentMode === 'fixed' && <label className="block text-sm font-semibold">Assigned to<select className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onChange({ fixedAssigneeId: event.target.value })} value={values.fixedAssigneeId}><option value="">Choose a household member</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName} ({member.role === 'guest' ? 'Guest' : 'Member'})</option>)}</select></label>}{values.assignmentMode === 'round_robin' && <div className="space-y-2 rounded-control border border-border p-3"><p className="text-sm text-muted">Choose the order. Guests may be included; unavailable members can be removed and restored later.</p>{members.map((member) => <label className="flex min-h-11 items-center gap-2" key={member.userId}><input checked={selected.includes(member.userId)} onChange={(event) => toggle(member.userId, event.target.checked)} type="checkbox" /><span>{member.displayName} <span className="text-sm text-muted">({member.role === 'guest' ? 'Guest' : 'Member'})</span></span></label>)}{selected.length > 0 && <ol aria-label="Rotation order" className="space-y-2">{selected.map((userId, index) => { const member = members.find((candidate) => candidate.userId === userId); return <li className="flex items-center justify-between gap-2 rounded-control bg-surface-strong px-3 py-2" key={userId}><span>{index + 1}. {member?.displayName ?? 'Former member'}</span><span className="flex gap-2"><button aria-label={`Move ${member?.displayName ?? 'member'} earlier`} className="min-h-11 px-2" disabled={index === 0} onClick={() => move(userId, -1)} type="button">↑</button><button aria-label={`Move ${member?.displayName ?? 'member'} later`} className="min-h-11 px-2" disabled={index === selected.length - 1} onClick={() => move(userId, 1)} type="button">↓</button></span></li> })}</ol>}</div>}</fieldset>
}
