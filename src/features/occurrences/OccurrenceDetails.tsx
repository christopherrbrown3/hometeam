import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useCompleteOccurrence, useSkipOccurrence, useSnoozeOccurrence, useUndoCompletion } from './mutations'
import type { OccurrenceWithTitle } from './todayQuery'

export function OccurrenceDetails({ occurrence, onClose }: Readonly<{ occurrence: OccurrenceWithTitle; onClose: () => void }>) {
  const [notice, setNotice] = useState<string | null>(null)
  const complete = useCompleteOccurrence(); const skip = useSkipOccurrence(); const snooze = useSnoozeOccurrence(); const undo = useUndoCompletion()
  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) { const result = await action(); setNotice(result.ok ? 'Saved. The latest task state is shown after refresh.' : result.error?.message ?? 'This task changed. Refresh and try again.') }
  const open = occurrence.lifecycle_state === 'open'
  return <section aria-label="Occurrence details" className="rounded-panel border border-border bg-surface p-4 space-y-3"><div className="flex justify-between gap-3"><div><h2 className="text-xl font-bold">{occurrence.title}</h2><p className="text-sm text-muted">Originally due {new Date(occurrence.original_due_start).toLocaleString()}</p></div><Button onClick={onClose} variant="secondary">Close</Button></div>{notice && <p role="status" className="text-sm text-muted">{notice}</p>}<div className="flex flex-wrap gap-2">{open && <><Button disabled={complete.isPending} onClick={() => void run(() => complete.mutateAsync({ expectedVersion: occurrence.version, occurrenceId: occurrence.id, keepOriginalRotation: false }))}>Complete</Button><Button disabled={snooze.isPending} onClick={() => void run(() => snooze.mutateAsync({ expectedVersion: occurrence.version, occurrenceId: occurrence.id, snoozedUntil: new Date(Date.now() + 30 * 60_000).toISOString() }))} variant="secondary">Snooze 30 min</Button><Button disabled={skip.isPending} onClick={() => void run(() => skip.mutateAsync({ expectedVersion: occurrence.version, occurrenceId: occurrence.id }))} variant="secondary">Skip</Button></>}{occurrence.lifecycle_state === 'completed' && <Button disabled={undo.isPending} onClick={() => void run(() => undo.mutateAsync({ expectedVersion: occurrence.version, occurrenceId: occurrence.id }))} variant="secondary">Undo</Button>}</div></section>
}
