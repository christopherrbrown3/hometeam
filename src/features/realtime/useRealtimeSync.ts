import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { purgeProtectedCache } from '../../app/protectedCache'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { queryKeysForRealtimeChange } from './invalidationMap'
import { createSubscriptionManager, type ActiveMembership, type RealtimeChange } from './subscriptionManager'

async function listActiveMemberships(userId: string): Promise<ActiveMembership[]> {
  const { data, error } = await supabase.from('household_memberships').select('household_id, role').eq('user_id', userId).eq('status', 'active').is('removed_at', null)
  if (error) throw error
  return data.map((membership) => ({ householdId: membership.household_id, role: membership.role }))
}

export function useRealtimeSync(onOccurrenceChange: (occurrenceId: string) => void) {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user.id
  const previousMembershipScope = useRef<string | null>(null)
  const memberships = useQuery({
    enabled: Boolean(userId),
    queryFn: () => listActiveMemberships(userId!),
    queryKey: userId ? queryKeys.memberships(userId) : ['memberships', 'anonymous'],
    retry: false,
  })
  const manager = useMemo(() => createSubscriptionManager(supabase, (change: RealtimeChange) => {
    for (const queryKey of queryKeysForRealtimeChange(change)) void queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
    if (change.table === 'task_occurrences' && typeof change.record.id === 'string') onOccurrenceChange(change.record.id)
  }), [onOccurrenceChange, queryClient])

  useEffect(() => {
    if (!userId || memberships.isPending) return
    const activeUserId = userId
    let active = true

    async function synchronize() {
      if (memberships.isError || !memberships.data || memberships.data.length === 0) {
        await manager.stop()
        if (active) await purgeProtectedCache(queryClient)
        return
      }

      const scope = memberships.data.map((membership) => `${membership.householdId}:${membership.role}`).sort().join('|')
      const membershipChanged = previousMembershipScope.current !== null && previousMembershipScope.current !== scope
      if (membershipChanged) {
        await manager.stop()
        if (active) await purgeProtectedCache(queryClient)
      }
      if (!active) return

      previousMembershipScope.current = scope
      await manager.start({ memberships: memberships.data, userId: activeUserId })
    }

    void synchronize()
    return () => { active = false; void manager.stop() }
  }, [manager, memberships.data, memberships.isError, memberships.isPending, queryClient, userId])
}
