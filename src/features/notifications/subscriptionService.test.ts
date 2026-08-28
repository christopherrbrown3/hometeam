import { describe, expect, it, vi } from 'vitest'
import { currentDeviceLabel, enablePushNotifications } from './subscriptionService'

describe('push subscription service', () => {
  it('uses bounded, recognizable device labels without exposing endpoints', () => {
    expect(currentDeviceLabel('Mozilla/5.0 (iPhone)')).toBe('iPhone Home Screen')
    expect(currentDeviceLabel('Mozilla/5.0 (Macintosh)')).toBe('Mac browser')
  })

  it('requests permission from the enable action but rejects an unconfigured deployment', async () => {
    const originalNotification = globalThis.Notification
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })

    await expect(enablePushNotifications({} as never, 'user-1', undefined)).rejects.toThrow(
      'Push notifications are not configured for this deployment.',
    )
    expect(requestPermission).toHaveBeenCalledOnce()
    vi.stubGlobal('Notification', originalNotification)
  })
})
