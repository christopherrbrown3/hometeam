import type { ChangeEvent } from 'react'
import type { TaskFormValues } from '../../tasks/taskFormSchema'

type Props = Readonly<{
  onChange: (next: TaskFormValues['recurrenceConfig']) => void
  recurrenceType: TaskFormValues['recurrenceType']
  value: TaskFormValues['recurrenceConfig']
}>

export function ScheduleFields({ onChange, recurrenceType, value }: Props) {
  if (recurrenceType === 'one_time') return <p className="text-sm text-muted">This task will be scheduled once on the selected date.</p>
  if (recurrenceType === 'completion_interval') {
    const config = value as { intervalMinutes: number; version: 1 }
    return <label className="block text-sm font-semibold">Repeat after (minutes)<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" min="1" onChange={(event) => onChange({ intervalMinutes: Number(event.target.value), version: 1 })} type="number" value={config.intervalMinutes} /></label>
  }
  const config = value as { frequency: 'daily' | 'weekly'; version: 1; weekdays?: number[] }
  const selected = config.weekdays ?? []
  function toggleDay(event: ChangeEvent<HTMLInputElement>) {
    const day = Number(event.target.value)
    const weekdays = event.target.checked ? [...selected, day].sort() : selected.filter((item) => item !== day)
    onChange({ frequency: 'weekly', version: 1, weekdays })
  }
  return <fieldset className="space-y-2"><legend className="text-sm font-semibold">Repeats</legend><select className="min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onChange(event.target.value === 'daily' ? { frequency: 'daily', version: 1 } : { frequency: 'weekly', version: 1, weekdays: selected })} value={config.frequency}><option value="daily">Every day</option><option value="weekly">Selected weekdays</option></select>{config.frequency === 'weekly' && <div className="flex flex-wrap gap-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, day) => <label className="flex min-h-11 items-center gap-1 rounded-control border border-border px-2 text-sm" key={label}><input checked={selected.includes(day)} onChange={toggleDay} type="checkbox" value={day} />{label}</label>)}</div>}</fieldset>
}
