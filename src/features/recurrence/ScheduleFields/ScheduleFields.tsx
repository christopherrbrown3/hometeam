import type { ChangeEvent } from 'react'
import type { TaskFormValues } from '../../tasks/taskFormSchema'

type Props = Readonly<{
  defaultMonthDay: number
  defaultWeekday: number
  onChange: (next: TaskFormValues['recurrenceConfig']) => void
  recurrenceType: TaskFormValues['recurrenceType']
  value: TaskFormValues['recurrenceConfig']
}>

export function ScheduleFields({ defaultMonthDay, defaultWeekday, onChange, recurrenceType, value }: Props) {
  if (recurrenceType === 'one_time') return <p className="text-sm text-muted">This task will be scheduled once on the selected date.</p>
  if (recurrenceType === 'completion_interval') {
    const config = value as { intervalMinutes: number; version: 1 }
    return <label className="block text-sm font-semibold">Repeat after (minutes)<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" min="1" onChange={(event) => onChange({ intervalMinutes: Number(event.target.value), version: 1 })} type="number" value={config.intervalMinutes} /></label>
  }
  const config = value as { dayOfMonth?: number; frequency: 'daily' | 'weekly' | 'monthly'; version: 1; weekdays?: number[] }
  const selected = config.weekdays ?? []
  function toggleDay(event: ChangeEvent<HTMLInputElement>) {
    const day = Number(event.target.value)
    const weekdays = event.target.checked ? [...selected, day].sort() : selected.filter((item) => item !== day)
    onChange({ frequency: 'weekly', version: 1, weekdays })
  }
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">Repeats</legend><select aria-label="Repeats" className="min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => { const frequency = event.target.value as typeof config.frequency; onChange(frequency === 'daily' ? { frequency: 'daily', version: 1 } : frequency === 'monthly' ? { dayOfMonth: config.dayOfMonth ?? defaultMonthDay, frequency: 'monthly', version: 1 } : { frequency: 'weekly', version: 1, weekdays: selected.length ? selected : [defaultWeekday] }) }} value={config.frequency}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month (same date)</option></select>{config.frequency === 'weekly' && <div><p className="mb-2 text-sm text-muted">Choose the days this routine repeats.</p><div className="flex flex-wrap gap-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, day) => <label className="flex min-h-11 items-center gap-1 rounded-control border border-border px-2 text-sm" key={label}><input checked={selected.includes(day)} onChange={toggleDay} type="checkbox" value={day} />{label}</label>)}</div></div>}{config.frequency === 'monthly' && <p className="text-sm text-muted">Repeats on day {config.dayOfMonth} each month, or the last day when a month is shorter.</p>}</fieldset>
}
