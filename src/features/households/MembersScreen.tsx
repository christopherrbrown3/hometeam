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
      <h2 className="text-lg font-bold">Members</h2>
      <ul className="mt-2 space-y-2" aria-label="Household members">
        {members.data.map((member) => (
          <li className="flex items-center justify-between rounded-control bg-surface-strong px-3 py-2" key={member.userId}>
            <span><span className="block font-semibold">{member.displayName}</span><span className="text-sm text-muted">{member.email}</span></span>
            <span className="text-sm capitalize text-muted">{member.role.replace('_', ' ')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
