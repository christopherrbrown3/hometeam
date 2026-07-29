import { describe, expect, it, vi } from 'vitest'
import { createSubscriptionManager, type RealtimeChange } from './subscriptionManager'

type RegisteredChange = Readonly<{ filter?: string; table: string }>

function createFakeClient() {
  const registrations: RegisteredChange[] = []
  const channels: { name: string; subscribe: ReturnType<typeof vi.fn> }[] = []
  const removeChannel = vi.fn().mockResolvedValue('ok')
  const client = {
    channel(name: string) {
      const channel = {
        on: vi.fn((_event: string, options: RegisteredChange) => {
          registrations.push(options)
          return channel
        }),
        subscribe: vi.fn(() => channel),
      }
      channels.push({ name, subscribe: channel.subscribe })
      return channel
    },
    removeChannel,
  }
  return { channels, client, registrations, removeChannel }
}

describe('Realtime subscription manager integration contract', () => {
  it('creates only household-filtered full-member feeds and tears them down', async () => {
    const fake = createFakeClient()
    const onChange = vi.fn<(change: RealtimeChange) => void>()
    const manager = createSubscriptionManager(fake.client as never, onChange)

    await manager.start({ memberships: [{ householdId: 'home-a', role: 'full_member' }], userId: 'user-a' })

    expect(fake.channels.map((channel) => channel.name)).toEqual(['hometeam:access:user-a', 'hometeam:household:home-a'])
    expect(fake.registrations).toEqual(expect.arrayContaining([
      expect.objectContaining({ filter: 'user_id=eq.user-a', table: 'platform_access' }),
      expect.objectContaining({ filter: 'household_id=eq.home-a', table: 'task_occurrences' }),
      expect.objectContaining({ filter: 'household_id=eq.home-a', table: 'task_events' }),
    ]))

    await manager.stop()
    expect(fake.removeChannel).toHaveBeenCalledTimes(2)
  })

  it('does not create a household-wide guest feed and rejects an empty scope', async () => {
    const fake = createFakeClient()
    const manager = createSubscriptionManager(fake.client as never, vi.fn())

    await manager.start({ memberships: [], userId: 'guest-a' })
    expect(fake.channels).toHaveLength(0)

    await manager.start({ memberships: [{ householdId: 'home-a', role: 'guest' }], userId: 'guest-a' })
    expect(fake.registrations).toEqual(expect.arrayContaining([expect.objectContaining({ filter: 'assignee_user_id=eq.guest-a', table: 'task_occurrences' })]))
    expect(fake.registrations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ filter: 'household_id=eq.home-a', table: 'task_series' }),
      expect.objectContaining({ filter: 'household_id=eq.home-a', table: 'household_memberships' }),
    ]))

    await manager.stop()
  })
})
