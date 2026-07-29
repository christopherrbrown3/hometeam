import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import type { MutationResult } from './mutationContracts'
import {
  cancelOccurrence,
  completeOccurrence,
  reopenOccurrence,
  skipOccurrence,
  snoozeOccurrence,
  undoCompletion,
  type Occurrence,
} from './occurrenceService'
import type { CancelOccurrenceInput, CompleteOccurrenceInput, ReopenOccurrenceInput, SkipOccurrenceInput, SnoozeOccurrenceInput, UndoCompletionInput } from './mutationContracts'

function useOccurrenceMutation<T extends { occurrenceId: string }>(mutationFn: (input: T) => Promise<MutationResult<Occurrence>>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: async (_result, _error, input) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.occurrence(input.occurrenceId) })
      await queryClient.invalidateQueries({ queryKey: ['occurrences'] })
    },
  })
}

export function useCompleteOccurrence() { return useOccurrenceMutation<CompleteOccurrenceInput>((input) => completeOccurrence(supabase, input)) }
export function useSnoozeOccurrence() { return useOccurrenceMutation<SnoozeOccurrenceInput>((input) => snoozeOccurrence(supabase, input)) }
export function useSkipOccurrence() { return useOccurrenceMutation<SkipOccurrenceInput>((input) => skipOccurrence(supabase, input)) }
export function useCancelOccurrence() { return useOccurrenceMutation<CancelOccurrenceInput>((input) => cancelOccurrence(supabase, input)) }
export function useUndoCompletion() { return useOccurrenceMutation<UndoCompletionInput>((input) => undoCompletion(supabase, input)) }
export function useReopenOccurrence() { return useOccurrenceMutation<ReopenOccurrenceInput>((input) => reopenOccurrence(supabase, input)) }
