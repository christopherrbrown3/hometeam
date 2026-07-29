import type { MutationErrorCode, MutationResult } from '../features/occurrences/mutationContracts'

type RpcError = Readonly<{ code?: string; message?: string }>

export function translateOccurrenceRpcError(error: RpcError): MutationResult<never> {
  const message = error.message ?? 'The task could not be updated.'
  const normalized = message.toLowerCase()
  let code: MutationErrorCode = 'invalid_state'

  if (error.code === '40001') code = 'stale_version'
  else if (normalized.includes('already completed')) code = 'already_completed'
  else if (normalized.includes('already skipped')) code = 'already_skipped'
  else if (normalized.includes('undo window')) code = 'undo_window_expired'
  else if (normalized.includes('guest_action_forbidden')) code = 'guest_action_forbidden'
  else if (error.code === '42501') code = 'access_denied'

  return { error: { code, message }, ok: false }
}
