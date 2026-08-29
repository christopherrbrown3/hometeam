import { describe, expect, it, vi } from 'vitest'
import { classifyWebPushError, createWebPushAdapter, type SendPushNotification } from './webPushAdapter.ts'

const delivery = {
  attempt_id: 'attempt-1',
  auth_key: 'auth',
  endpoint: 'https://push.example.test/device',
  outbox_id: '12345678-1234-1234-1234-123456789012',
  p256dh_key: 'p256dh',
  payload: { body: 'Task body', title: 'Task due soon' },
} as const

const vapid = {
  privateKey: 'private',
  publicKey: 'public',
  subject: 'mailto:admin@example.test',
} as const

describe('Web Push adapter', () => {
  it('sends the encrypted payload with bounded delivery metadata', async () => {
    const send = vi.fn<SendPushNotification>().mockResolvedValue(true)

    await expect(createWebPushAdapter(send)(delivery, vapid)).resolves.toEqual({ outcome: 'sent' })
    expect(send).toHaveBeenCalledWith(
      { endpoint: delivery.endpoint, keys: { auth: 'auth', p256dh: 'p256dh' } },
      delivery.payload,
      vapid,
      { topic: 'hometeam-123456781234123412341234', ttl: 3600, urgency: 'normal' },
    )
  })

  it('maps the package gone-subscription sentinel to an isolated permanent failure', async () => {
    const send = vi.fn<SendPushNotification>().mockResolvedValue(false)

    await expect(createWebPushAdapter(send)(delivery, vapid)).resolves.toEqual({
      errorCode: 'push_subscription_gone',
      outcome: 'permanent_failure',
      responseStatus: 410,
    })
  })

  it('honors Retry-After for transient HTTP failures without exposing response bodies', () => {
    expect(classifyWebPushError({
      body: 'provider details must not be persisted',
      retryAfterMs: 61_001,
      statusCode: 429,
    })).toEqual({
      errorCode: 'push_rate_limited',
      outcome: 'retryable',
      responseStatus: 429,
      retryAfterSeconds: 62,
    })
  })

  it.each([404, 410])('classifies HTTP %s as a gone subscription', (statusCode) => {
    expect(classifyWebPushError({ statusCode })).toMatchObject({
      outcome: 'permanent_failure',
      responseStatus: statusCode,
    })
  })

  it('retries ordinary network failures', () => {
    expect(classifyWebPushError(new TypeError('network endpoint details'))).toEqual({
      errorCode: 'push_network_error',
      outcome: 'retryable',
    })
  })
})
