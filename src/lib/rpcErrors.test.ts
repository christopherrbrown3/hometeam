import { describe, expect, it } from 'vitest'
import { translateOccurrenceRpcError } from './rpcErrors'

describe('translateOccurrenceRpcError', () => {
  it('preserves a first-update-wins conflict for a refetch', () => {
    expect(translateOccurrenceRpcError({ code: '40001', message: 'stale occurrence version' })).toMatchObject({ error: { code: 'stale_version' }, ok: false })
  })

  it('recognizes stale responses even when a transport omits the SQL code', () => {
    expect(translateOccurrenceRpcError({ message: 'stale occurrence version' })).toMatchObject({ error: { code: 'stale_version' }, ok: false })
  })

  it('does not disguise a guest authorization failure as a generic conflict', () => {
    expect(translateOccurrenceRpcError({ code: '42501', message: 'guest_action_forbidden' })).toMatchObject({ error: { code: 'guest_action_forbidden' }, ok: false })
  })
})
