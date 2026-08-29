import { describe, expect, it, vi } from 'vitest'
import type { DeliveryRpcClient, PushDeliveryAdapter } from './types.ts'
import { runDeliveryBatch } from './worker.ts'

const claimedDelivery = {
  attempt_id: 'attempt-1',
  auth_key: 'auth-secret',
  endpoint: 'https://push.example.test/private-endpoint',
  outbox_id: 'outbox-1',
  p256dh_key: 'public-key',
  payload: { title: 'Household task update' },
} as const

const vapid = {
  privateKey: 'private',
  publicKey: 'public',
  subject: 'mailto:admin@example.test',
} as const

describe('notification delivery worker', () => {
  it('claims, sends, and records a device result without echoing endpoint material', async () => {
    const calls: Array<{ input: Readonly<Record<string, unknown>>, name: string }> = []
    const client: DeliveryRpcClient = {
      rpc: async <T>(name: string, input: Readonly<Record<string, unknown>>) => {
        calls.push({ input, name })
        return name === 'claim_notification_deliveries'
          ? { data: [claimedDelivery] as T, error: null }
          : { data: null, error: null }
      },
    }
    const deliver = vi.fn<PushDeliveryAdapter>().mockResolvedValue({ outcome: 'sent' })

    await expect(runDeliveryBatch(client, deliver, vapid, {
      limit: 10,
      now: new Date('2026-08-29T12:00:00Z'),
    })).resolves.toEqual({ claimed: 1, failed: 0, retried: 0, sent: 1 })

    expect(deliver).toHaveBeenCalledWith(claimedDelivery, vapid)
    expect(calls[1]).toEqual({
      input: {
        input_attempt_id: 'attempt-1',
        input_error_code: null,
        input_now: '2026-08-29T12:00:00.000Z',
        input_outcome: 'sent',
        input_response_status: null,
        input_retry_after_seconds: null,
      },
      name: 'record_notification_delivery_result',
    })
    expect(JSON.stringify(calls[1])).not.toContain('private-endpoint')
    expect(JSON.stringify(calls[1])).not.toContain('auth-secret')
  })

  it('persists retry metadata returned by the adapter', async () => {
    const record = vi.fn()
    const client: DeliveryRpcClient = {
      rpc: async <T>(name: string, input: Readonly<Record<string, unknown>>) => {
        if (name === 'claim_notification_deliveries') {
          return { data: [claimedDelivery] as T, error: null }
        }
        record(input)
        return { data: null, error: null }
      },
    }
    const deliver = vi.fn<PushDeliveryAdapter>().mockResolvedValue({
      errorCode: 'push_rate_limited',
      outcome: 'retryable',
      responseStatus: 429,
      retryAfterSeconds: 90,
    })

    const result = await runDeliveryBatch(client, deliver, vapid, {
      limit: 1,
      now: new Date('2026-08-29T12:00:00Z'),
    })

    expect(result).toEqual({ claimed: 1, failed: 0, retried: 1, sent: 0 })
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      input_error_code: 'push_rate_limited',
      input_response_status: 429,
      input_retry_after_seconds: 90,
    }))
  })

  it('fails closed when a claimed row does not match the endpoint contract', async () => {
    const client: DeliveryRpcClient = {
      rpc: async <T>() => ({ data: [{ attempt_id: 'missing-credentials' }] as T, error: null }),
    }

    await expect(runDeliveryBatch(client, vi.fn(), vapid, {
      limit: 1,
      now: new Date(),
    })).rejects.toThrow('notification_delivery_claim_failed')
  })
})
