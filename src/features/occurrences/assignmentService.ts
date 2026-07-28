import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

type HomeTeamClient = SupabaseClient<Database>
type Occurrence = Database['public']['Tables']['task_occurrences']['Row']

function resultOrThrow(result: { data: Occurrence | null; error: Error | null }, fallback: string) {
  if (result.error || !result.data) throw result.error ?? new Error(fallback)
  return result.data
}

export function claimOccurrence(client: HomeTeamClient, occurrenceId: string, expectedVersion: number) {
  return client.rpc('claim_occurrence', { input_expected_version: expectedVersion, input_occurrence_id: occurrenceId }).then((result) => resultOrThrow(result, 'The occurrence could not be claimed.'))
}

export function assignOccurrence(client: HomeTeamClient, occurrenceId: string, assigneeUserId: string, expectedVersion: number, lock = false) {
  return client.rpc('assign_occurrence', { input_assignee_user_id: assigneeUserId, input_expected_version: expectedVersion, input_lock: lock, input_occurrence_id: occurrenceId }).then((result) => resultOrThrow(result, 'The occurrence could not be assigned.'))
}

export function setOccurrenceAssignmentLock(client: HomeTeamClient, occurrenceId: string, expectedVersion: number, locked: boolean) {
  return client.rpc('set_occurrence_assignment_lock', { input_expected_version: expectedVersion, input_locked: locked, input_occurrence_id: occurrenceId }).then((result) => resultOrThrow(result, 'The assignment lock could not be changed.'))
}

export async function replaceRotationRoster(client: HomeTeamClient, seriesId: string, memberIds: string[]) {
  const { error } = await client.rpc('replace_rotation_roster', { input_member_ids: memberIds, input_series_id: seriesId })
  if (error) throw error
}
