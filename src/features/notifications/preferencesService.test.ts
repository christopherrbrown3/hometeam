import { describe, expect, it, vi } from 'vitest'
import { defaultNotificationPreferences, saveNotificationPreferences } from './preferencesService'

describe('notification preferences service', () => {
  it('validates and upserts only the current user preference contract', async () => {
    const saved = {
      ...defaultNotificationPreferences,
      created_at: '2026-08-28T00:00:00Z',
      updated_at: '2026-08-28T00:00:00Z',
      user_id: 'user-1',
    }
    const chain = {
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: saved, error: null }),
      upsert: vi.fn(),
    }
    chain.upsert.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    const client = { from: vi.fn().mockReturnValue(chain) }

    await expect(saveNotificationPreferences(client as never, 'user-1', defaultNotificationPreferences)).resolves.toEqual(saved)
    expect(chain.upsert).toHaveBeenCalledWith(
      { ...defaultNotificationPreferences, user_id: 'user-1' },
      { onConflict: 'user_id' },
    )
  })

  it('rejects an unsupported due-soon interval before writing', async () => {
    const client = { from: vi.fn() }

    await expect(saveNotificationPreferences(client as never, 'user-1', {
      ...defaultNotificationPreferences,
      due_soon_minutes: 10 as never,
    })).rejects.toThrow()
    expect(client.from).not.toHaveBeenCalled()
  })
})
