import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import { useCompleteOccurrence, useSkipOccurrence, useSnoozeOccurrence, useUndoCompletion } from './mutations'
import type { OccurrenceWithTitle } from './todayQuery'
import { RemoteChangeNotice } from '../realtime/RemoteChangeNotice'

export function OccurrenceDetails({ occurrence, onClose }: Readonly<{ occurrence: OccurrenceWithTitle; onClose: () => void }>) {
  const [notice, setNotice] = useState<string | null>(null)
  const authoritativeOccurrence = useQuery({
    queryKey: queryKeys.occurrence(occurrence.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('task_occurrences').select('*').eq('id', occurrence.id).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const complete = useCompleteOccurrence(); const skip = useSkipOccurrence(); const snooze = useSnoozeOccurrence(); const undo = useUndoCompletion()
  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) { const result = await action(); setNotice(result.ok ? 'Saved. The latest task state is shown after refresh.' : result.error?.message ?? 'This task changed. Refresh and try again.') }
  const current = authoritativeOccurrence.data ?? occurrence
  const open = current.lifecycle_state === 'open'

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      aria-labelledby="occurrence-details-title"
      aria-modal="true"
      className="sheet-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      role="dialog"
    >
      <section className="sheet-panel space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand">Task details</p>
            <h2 className="mt-1 text-xl font-bold" id="occurrence-details-title">{occurrence.title}</h2>
            <p className="mt-1 text-sm text-muted">Due {new Date(current.original_due_start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <button aria-label="Close task details" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-strong hover:text-ink" onClick={onClose} type="button">
            <Icon name="plus" size={20} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </header>
        <RemoteChangeNotice occurrenceId={occurrence.id} />
        {authoritativeOccurrence.data === null && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="status">You no longer have access to this task.</p>}
        {notice && <p className="rounded-control bg-surface-strong p-3 text-sm text-muted" role="status">{notice}</p>}
        <div className="flex flex-wrap gap-2">
          {open && authoritativeOccurrence.data !== null && (
            <>
              <Button className="flex-1 sm:flex-none" disabled={complete.isPending} onClick={() => void run(() => complete.mutateAsync({ expectedVersion: current.version, occurrenceId: current.id, keepOriginalRotation: false }))}>
                <Icon name="check" size={18} /> Complete
              </Button>
              <Button disabled={snooze.isPending} onClick={() => void run(() => snooze.mutateAsync({ expectedVersion: current.version, occurrenceId: current.id, snoozedUntil: new Date(Date.now() + 30 * 60_000).toISOString() }))} variant="secondary">
                <Icon name="clock" size={17} /> Snooze 30 min
              </Button>
              <Button disabled={skip.isPending} onClick={() => void run(() => skip.mutateAsync({ expectedVersion: current.version, occurrenceId: current.id }))} variant="secondary">Skip</Button>
            </>
          )}
          {current.lifecycle_state === 'completed' && authoritativeOccurrence.data !== null && <Button disabled={undo.isPending} onClick={() => void run(() => undo.mutateAsync({ expectedVersion: current.version, occurrenceId: current.id }))} variant="secondary">Undo completion</Button>}
        </div>
      </section>
    </div>
  )
}
