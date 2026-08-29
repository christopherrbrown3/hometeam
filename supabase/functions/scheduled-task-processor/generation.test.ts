import { describe, expect, it } from 'vitest'
import type { GenerationRpcClient } from './generation.ts'
import { addUtcDays, runGenerationPhase } from './generation.ts'

describe('scheduled generation phase', () => {
  it('uses a deterministic bounded UTC horizon and applies missed policies after generation', async () => {
    const calls: string[] = []
    const inputs: Readonly<Record<string, unknown>>[] = []
    const client: GenerationRpcClient = {
      rpc: async <T>(name, input) => {
        calls.push(name)
        inputs.push(input)
        return { data: (name === 'generate_calendar_occurrences' ? 4 : 2) as T, error: null }
      },
    }

    await expect(runGenerationPhase(client, new Date('2026-08-29T23:59:59Z'), 60)).resolves.toEqual({
      generated: 4,
      missedPoliciesApplied: 2,
      through: '2026-10-28',
    })
    expect(calls).toEqual(['generate_calendar_occurrences', 'apply_missed_policies'])
    expect(inputs[0]).toEqual({ input_from: '2026-08-28', input_through: '2026-10-28' })
    expect(addUtcDays(new Date('2028-02-28T12:00:00Z'), 1)).toBe('2028-02-29')
  })

  it('rejects an unbounded generation request', async () => {
    await expect(runGenerationPhase({ rpc: async () => ({ data: 0, error: null }) }, new Date(), 91))
      .rejects.toThrow('invalid_generation_horizon')
  })
})
