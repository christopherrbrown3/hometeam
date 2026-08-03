import type { Database } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { CategoryIcon } from '../categories/CategoryIcon'
import { SeriesActions } from './SeriesActions'

export function TaskDetails({ categoryName, series, onChanged, onEdit }: Readonly<{ categoryName?: string | null; series: Database['public']['Tables']['task_series']['Row']; onChanged: () => void; onEdit: () => void }>) {
  return (
    <details className="settings-panel group">
      <summary className="settings-panel-header">
        <CategoryIcon categoryName={categoryName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{series.title}</span>
          <span className="mt-0.5 block text-xs capitalize text-muted">{series.recurrence_type.replaceAll('_', ' ')} · {series.series_status}</span>
        </span>
        <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
      </summary>
      <div className="settings-panel-content border-t border-border pt-4">
        {series.description && <p className="mb-4 text-sm text-muted">{series.description}</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">Assignment</dt><dd className="mt-0.5 font-medium capitalize">{series.assignment_mode.replaceAll('_', ' ')}</dd></div>
          <div><dt className="text-muted">Missed tasks</dt><dd className="mt-0.5 font-medium capitalize">{series.missed_policy.replaceAll('_', ' ')}</dd></div>
        </dl>
        <div className="mt-4 space-y-3">{series.series_status !== 'deleted' && <Button onClick={onEdit} variant="secondary">Edit task</Button>}<SeriesActions onChanged={onChanged} seriesId={series.id} status={series.series_status} /></div>
      </div>
    </details>
  )
}
