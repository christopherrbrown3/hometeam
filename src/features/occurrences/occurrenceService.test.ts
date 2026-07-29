import { describe, expect, it } from 'vitest'
import { completeOccurrence } from './occurrenceService'

const occurrence = {
  assignee_user_id: null, assignment_locked: false, assignment_source: 'unassigned' as const, completed_at: null, completed_by: null,
  created_at: '2026-01-01T00:00:00Z', deleted_at: null, household_id: '00000000-0000-0000-0000-000000000201', id: '00000000-0000-0000-0000-000000000701', is_all_day: false,
  lifecycle_state: 'open' as const, occurrence_key: 'fixture', original_due_end: '2026-01-01T09:15:00Z', original_due_start: '2026-01-01T09:00:00Z', rotation_override: false,
  series_id: '00000000-0000-0000-0000-000000000401', skip_reason: null, skipped_at: null, skipped_by: null, snoozed_by: null, snoozed_until: null, updated_at: '2026-01-01T00:00:00Z', version: 2,
}

describe('completeOccurrence', () => {
  it('returns the authoritative RPC row without direct table writes', async () => {
    const client = { rpc: () => Promise.resolve({ data: occurrence, error: null }) }
    const result = await completeOccurrence(client as never, { expectedVersion: 1, keepOriginalRotation: false, occurrenceId: occurrence.id })
    expect(result).toEqual({ data: occurrence, ok: true })
  })

  it('validates a positive expected version before making the RPC', async () => {
    const client = { rpc: () => Promise.resolve({ data: occurrence, error: null }) }
    await expect(completeOccurrence(client as never, { expectedVersion: 0, keepOriginalRotation: false, occurrenceId: occurrence.id })).rejects.toThrow()
  })
})
