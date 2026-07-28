import type { HouseholdMember } from '../households/membershipService'

export function RotationRosterEditor({ members, onChange, selected }: Readonly<{ members: readonly HouseholdMember[]; onChange: (memberIds: string[]) => void; selected: readonly string[] }>) {
  function move(userId: string, direction: -1 | 1) {
    const index = selected.indexOf(userId); const destination = index + direction
    if (destination < 0 || destination >= selected.length) return
    const next = [...selected]; [next[index], next[destination]] = [next[destination]!, next[index]!]
    onChange(next)
  }
  function toggle(userId: string, included: boolean) { onChange(included ? [...selected, userId] : selected.filter((memberId) => memberId !== userId)) }
  return <div className="space-y-2 rounded-control border border-border p-3"><p className="text-sm text-muted">Choose the order. Guests may be included; unavailable members can be removed and restored later.</p>{members.map((member) => <label className="flex min-h-11 items-center gap-2" key={member.userId}><input checked={selected.includes(member.userId)} onChange={(event) => toggle(member.userId, event.target.checked)} type="checkbox" /><span>{member.displayName} <span className="text-sm text-muted">({member.role === 'guest' ? 'Guest' : 'Member'})</span></span></label>)}{selected.length > 0 && <ol aria-label="Rotation order" className="space-y-2">{selected.map((userId, index) => { const member = members.find((candidate) => candidate.userId === userId); return <li className="flex items-center justify-between gap-2 rounded-control bg-surface-strong px-3 py-2" key={userId}><span>{index + 1}. {member?.displayName ?? 'Former member'}</span><span className="flex gap-2"><button aria-label={`Move ${member?.displayName ?? 'member'} earlier`} className="min-h-11 px-2" disabled={index === 0} onClick={() => move(userId, -1)} type="button">↑</button><button aria-label={`Move ${member?.displayName ?? 'member'} later`} className="min-h-11 px-2" disabled={index === selected.length - 1} onClick={() => move(userId, 1)} type="button">↓</button></span></li> })}</ol>}</div>
}
