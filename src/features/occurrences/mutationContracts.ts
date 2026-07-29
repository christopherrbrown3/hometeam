import { z } from 'zod'

// PostgreSQL UUIDs are accepted in their canonical hexadecimal form. This also
// keeps the client compatible with stable local fixture UUIDs.
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID')

const occurrenceIdentity = z.object({
  expectedVersion: z.number().int().positive(),
  occurrenceId: uuid,
})

export const completeOccurrenceInput = occurrenceIdentity.extend({ keepOriginalRotation: z.boolean().default(false) })
export const snoozeOccurrenceInput = occurrenceIdentity.extend({ snoozedUntil: z.iso.datetime() })
export const skipOccurrenceInput = occurrenceIdentity.extend({ reason: z.string().trim().max(280).optional() })
export const cancelOccurrenceInput = skipOccurrenceInput
export const undoCompletionInput = occurrenceIdentity
export const reopenOccurrenceInput = occurrenceIdentity

export type CompleteOccurrenceInput = z.infer<typeof completeOccurrenceInput>
export type SnoozeOccurrenceInput = z.infer<typeof snoozeOccurrenceInput>
export type SkipOccurrenceInput = z.infer<typeof skipOccurrenceInput>
export type CancelOccurrenceInput = z.infer<typeof cancelOccurrenceInput>
export type UndoCompletionInput = z.infer<typeof undoCompletionInput>
export type ReopenOccurrenceInput = z.infer<typeof reopenOccurrenceInput>

export type MutationErrorCode =
  | 'access_denied'
  | 'already_completed'
  | 'already_skipped'
  | 'guest_action_forbidden'
  | 'invalid_state'
  | 'stale_version'
  | 'undo_window_expired'

export type MutationResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; error: Readonly<{ code: MutationErrorCode; current?: unknown; message: string }> }>
