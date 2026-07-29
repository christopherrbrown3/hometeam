import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export type ActiveMembership = Readonly<{
  householdId: string
  role: Database['public']['Enums']['household_member_role']
}>

export type RealtimeTable = 'platform_access' | 'household_memberships' | 'task_series' | 'task_occurrences' | 'task_events'

export type RealtimeChange = Readonly<{
  eventType: RealtimePostgresChangesPayload<Record<string, unknown>>['eventType']
  record: Readonly<Record<string, unknown>>
  table: RealtimeTable
}>

type RealtimeClient = Pick<SupabaseClient<Database>, 'channel' | 'removeChannel'>
type SubscriptionDefinition = Readonly<{ filter?: string; table: RealtimeTable }>

export type SubscriptionManager = Readonly<{
  start: (input: Readonly<{ memberships: readonly ActiveMembership[]; userId: string }>) => Promise<void>
  stop: () => Promise<void>
}>

function channelName(prefix: string, id: string) {
  return `hometeam:${prefix}:${id}`
}

function subscribeTo(channel: RealtimeChannel, definition: SubscriptionDefinition, onChange: (change: RealtimeChange) => void) {
  return channel.on(
    'postgres_changes',
    { event: '*', filter: definition.filter, schema: 'public', table: definition.table },
    (payload) => onChange({
      eventType: payload.eventType,
      record: (payload.new ?? payload.old ?? {}) as Record<string, unknown>,
      table: definition.table,
    }),
  )
}

/** A small, RLS-backed boundary: payloads signal refetches and are never cached. */
export function createSubscriptionManager(client: RealtimeClient, onChange: (change: RealtimeChange) => void): SubscriptionManager {
  let channels: RealtimeChannel[] = []
  let generation = 0

  async function stopChannels() {
    const previousChannels = channels
    channels = []
    await Promise.all(previousChannels.map(async (channel) => { await client.removeChannel(channel) }))
  }

  async function stop() {
    generation += 1
    await stopChannels()
  }

  function addChannel(name: string, definitions: readonly SubscriptionDefinition[]) {
    let channel = client.channel(name)
    for (const definition of definitions) channel = subscribeTo(channel, definition, onChange)
    channels.push(channel.subscribe())
  }

  async function start(input: Readonly<{ memberships: readonly ActiveMembership[]; userId: string }>) {
    const startGeneration = generation + 1
    generation = startGeneration
    await stopChannels()
    if (startGeneration !== generation) return
    if (input.memberships.length === 0) return

    addChannel(channelName('access', input.userId), [
      { filter: `user_id=eq.${input.userId}`, table: 'platform_access' },
      { filter: `user_id=eq.${input.userId}`, table: 'household_memberships' },
    ])

    for (const membership of input.memberships.filter((candidate) => candidate.role === 'full_member')) {
      addChannel(channelName('household', membership.householdId), [
        { filter: `household_id=eq.${membership.householdId}`, table: 'household_memberships' },
        { filter: `household_id=eq.${membership.householdId}`, table: 'task_series' },
        { filter: `household_id=eq.${membership.householdId}`, table: 'task_occurrences' },
        { filter: `household_id=eq.${membership.householdId}`, table: 'task_events' },
      ])
    }

    const guestMemberships = input.memberships.filter((candidate) => candidate.role === 'guest')
    if (guestMemberships.length > 0) {
      // task_events has no assignee column. Its RLS policy joins each event to
      // an occurrence currently assigned to this guest before delivery.
      addChannel(channelName('guest-events', input.userId), [{ table: 'task_events' }])
      for (const membership of guestMemberships) {
        addChannel(channelName('guest-occurrences', membership.householdId), [
          { filter: `assignee_user_id=eq.${input.userId}`, table: 'task_occurrences' },
        ])
      }
    }
  }

  return { start, stop }
}
