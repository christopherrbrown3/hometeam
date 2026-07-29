import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { listHouseholdMembers } from './membershipService'

export function MembersScreen({ householdId }: Readonly<{ householdId: string }>) {
  const members = useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => listHouseholdMembers(supabase, householdId),
  })

  if (members.isPending) return <p>Loading members…</p>
  if (members.isError) return <p className="text-danger" role="alert">{members.error.message}</p>

  return (
    <section>
      <h2 className="sr-only">Members</h2>
      <ul className="space-y-2" aria-label="Household members">
        {members.data.map((member) => (
          <li className="flex items-center justify-between gap-3 rounded-control bg-canvas px-3 py-2.5" key={member.userId}>
            <span><span className="block font-semibold">{member.displayName}</span><span className="text-sm text-muted">@{member.username}</span></span>
            <span className="rounded-full bg-surface-strong px-2.5 py-1 text-xs font-semibold capitalize text-muted">{member.role.replace('_', ' ')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
