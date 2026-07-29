import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  cancelOccurrenceInput,
  completeOccurrenceInput,
  reopenOccurrenceInput,
  skipOccurrenceInput,
  snoozeOccurrenceInput,
  undoCompletionInput,
  type CancelOccurrenceInput,
  type CompleteOccurrenceInput,
  type MutationResult,
  type ReopenOccurrenceInput,
  type SkipOccurrenceInput,
  type SnoozeOccurrenceInput,
  type UndoCompletionInput,
} from './mutationContracts'
import { translateOccurrenceRpcError } from '../../lib/rpcErrors'

type HomeTeamClient = SupabaseClient<Database>
export type Occurrence = Database['public']['Tables']['task_occurrences']['Row']

function result<T>(rpcResult: { data: T | null; error: { code?: string; message?: string } | null }): MutationResult<T> {
  if (rpcResult.error || !rpcResult.data) return translateOccurrenceRpcError(rpcResult.error ?? { message: 'The task could not be updated.' })
  return { data: rpcResult.data, ok: true }
}

export async function completeOccurrence(client: HomeTeamClient, input: CompleteOccurrenceInput): Promise<MutationResult<Occurrence>> {
  const value = completeOccurrenceInput.parse(input)
  return result(await client.rpc('complete_occurrence', { input_expected_version: value.expectedVersion, input_keep_original_rotation: value.keepOriginalRotation, input_occurrence_id: value.occurrenceId }))
}

export async function snoozeOccurrence(client: HomeTeamClient, input: SnoozeOccurrenceInput): Promise<MutationResult<Occurrence>> {
  const value = snoozeOccurrenceInput.parse(input)
  return result(await client.rpc('snooze_occurrence', { input_expected_version: value.expectedVersion, input_occurrence_id: value.occurrenceId, input_snoozed_until: value.snoozedUntil }))
}

export async function skipOccurrence(client: HomeTeamClient, input: SkipOccurrenceInput): Promise<MutationResult<Occurrence>> {
  const value = skipOccurrenceInput.parse(input)
  return result(await client.rpc('skip_occurrence', { input_expected_version: value.expectedVersion, input_occurrence_id: value.occurrenceId, input_reason: value.reason ?? null }))
}

export async function cancelOccurrence(client: HomeTeamClient, input: CancelOccurrenceInput): Promise<MutationResult<Occurrence>> {
  const value = cancelOccurrenceInput.parse(input)
  return result(await client.rpc('cancel_occurrence', { input_expected_version: value.expectedVersion, input_occurrence_id: value.occurrenceId, input_reason: value.reason ?? null }))
}

export async function undoCompletion(client: HomeTeamClient, input: UndoCompletionInput): Promise<MutationResult<Occurrence>> {
  const value = undoCompletionInput.parse(input)
  return result(await client.rpc('undo_completion', { input_expected_version: value.expectedVersion, input_occurrence_id: value.occurrenceId }))
}

export async function reopenOccurrence(client: HomeTeamClient, input: ReopenOccurrenceInput): Promise<MutationResult<Occurrence>> {
  const value = reopenOccurrenceInput.parse(input)
  return result(await client.rpc('reopen_occurrence', { input_expected_version: value.expectedVersion, input_occurrence_id: value.occurrenceId }))
}
