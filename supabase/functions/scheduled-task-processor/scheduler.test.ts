import { describe, expect, it, vi } from 'vitest'
import type { PushDeliveryAdapter } from '../process-notifications/types.ts'
import type { SchedulerRpcClient } from './scheduler.ts'
import { runScheduledProcessor } from './scheduler.ts'

const vapid = { privateKey: 'private', publicKey: 'public', subject: 'mailto:admin@example.test' }
const options = {
  deliveryLimit: 25,
  generationHorizonDays: 60,
  leaseSeconds: 120,
  notificationLimit: 200,
  now: new Date('2026-08-29T12:00:00Z'),
  timeBudgetMs: 45_000,
} as const

describe('scheduled task processor', () => {
  it('runs every phase once in order and releases the durable lease', async () => {
    const calls: Array<{ input: Readonly<Record<string, unknown>>, name: string }> = []
    const client: SchedulerRpcClient = {
      rpc: async <T>(name: string, input: Readonly<Record<string, unknown>>) => {
        calls.push({ input, name })
        const data = {
          apply_missed_policies: 2,
          claim_notification_deliveries: [],
          claim_scheduled_task_run: [{ acquired: true, generation_through: null, run_token: 'run-1' }],
          complete_scheduled_task_run: true,
          generate_calendar_occurrences: 4,
          produce_scheduled_notifications: 3,
        }[name]
        return { data: data as T, error: null }
      },
    }

    await expect(runScheduledProcessor(client, vi.fn<PushDeliveryAdapter>(), vapid, {
      ...options,
      clock: vi.fn().mockReturnValue(1_000),
    })).resolves.toMatchObject({
      delivery: { claimed: 0, failed: 0, retried: 0, sent: 0 },
      generated: 4,
      missedPoliciesApplied: 2,
      notificationsProduced: 3,
      status: 'completed',
    })
    expect(calls.map(({ name }) => name)).toEqual([
      'claim_scheduled_task_run',
      'generate_calendar_occurrences',
      'apply_missed_policies',
      'produce_scheduled_notifications',
      'claim_notification_deliveries',
      'complete_scheduled_task_run',
    ])
    expect(calls.at(-1)?.input).toMatchObject({ input_error: null, input_run_token: 'run-1' })
  })

  it('does no work when another run holds the lease', async () => {
    const client: SchedulerRpcClient = {
      rpc: async <T>() => ({
        data: [{ acquired: false, generation_through: '2026-10-28', run_token: null }] as T,
        error: null,
      }),
    }

    await expect(runScheduledProcessor(client, vi.fn(), vapid, options)).resolves.toEqual({ status: 'locked' })
  })

  it('records a bounded phase code and releases the lease after failure', async () => {
    const complete = vi.fn()
    const client: SchedulerRpcClient = {
      rpc: async <T>(name: string, input: Readonly<Record<string, unknown>>) => {
        if (name === 'claim_scheduled_task_run') {
          return { data: [{ acquired: true, generation_through: null, run_token: 'run-2' }] as T, error: null }
        }
        if (name === 'generate_calendar_occurrences') return { data: null, error: {} }
        if (name === 'complete_scheduled_task_run') {
          complete(input)
          return { data: true as T, error: null }
        }
        return { data: null, error: null }
      },
    }

    await expect(runScheduledProcessor(client, vi.fn(), vapid, options))
      .rejects.toThrow('calendar_generation_failed')
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({
      input_error: 'calendar_generation_failed',
      input_run_token: 'run-2',
    }))
  })

  it('skips delivery when earlier phases exhaust the time budget', async () => {
    const calls: string[] = []
    const client: SchedulerRpcClient = {
      rpc: async <T>(name: string) => {
        calls.push(name)
        const data = name === 'claim_scheduled_task_run'
          ? [{ acquired: true, generation_through: null, run_token: 'run-3' }]
          : name === 'complete_scheduled_task_run'
            ? true
            : 0
        return { data: data as T, error: null }
      },
    }
    const clock = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(50_000).mockReturnValue(50_001)

    const result = await runScheduledProcessor(client, vi.fn(), vapid, { ...options, clock })

    expect(result.delivery).toEqual({ claimed: 0, failed: 0, retried: 0, sent: 0 })
    expect(calls).not.toContain('claim_notification_deliveries')
  })
})
