import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
export function SeriesActions({ seriesId, status, onChanged }: Readonly<{ seriesId: string; status: 'active' | 'paused' | 'deleted'; onChanged: () => void }>) {
  const [message, setMessage] = useState<string | null>(null)
  async function call(name: 'pause_task_series' | 'resume_task_series' | 'delete_task_series', args: object, successMessage: string) {
    const { error } = await supabase.rpc(name, args as never)
    setMessage(error?.message ?? successMessage)
    if (!error) onChanged()
  }
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{status === 'active' && <Button onClick={() => void call('pause_task_series', { input_series_id: seriesId }, 'Paused. Overdue work was moved to history and future work is hidden until you resume it.')} variant="secondary">Pause task</Button>}{status === 'paused' && <Button onClick={() => void call('resume_task_series', { input_series_id: seriesId }, 'Resumed. Future scheduled work is visible again.')} variant="secondary">Resume task</Button>}{status !== 'deleted' && <Button onClick={() => void call('delete_task_series', { input_series_id: seriesId }, 'Deleted.')} variant="secondary">Delete</Button>}</div>{message && <p className="text-sm text-muted" role="status">{message}</p>}</div>
}
