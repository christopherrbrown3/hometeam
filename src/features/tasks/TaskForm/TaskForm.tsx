import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ScheduleFields } from '../../recurrence/ScheduleFields/ScheduleFields'
import type { ScheduleSlotInput } from '../../recurrence/contracts'
import type { HouseholdMember } from '../../households/membershipService'
import { AssignmentFields } from '../AssignmentFields'
import { taskFormSchema, type TaskFormValues } from '../taskFormSchema'
import { Icon } from '../../../components/ui/Icon'

export type TaskFormProps = Readonly<{
  categories: readonly Readonly<{ id: string; name: string }>[]
  householdId: string
  initialValue?: Partial<TaskFormValues>
  members: readonly HouseholdMember[]
  onSave: (values: TaskFormValues) => Promise<void>
}>

function today() { return new Date().toISOString().slice(0, 10) }

const defaultSlot: ScheduleSlotInput = { endDayOffset: 0, endTime: '09:15', isAllDay: false, startTime: '09:00' }

function defaultValues(initial?: Partial<TaskFormValues>): TaskFormValues {
  return {
    assignmentMode: 'unassigned', categoryId: '', confirmationRequired: false, description: '', effectiveFrom: today(), endType: 'never', fixedAssigneeId: '', missedPolicy: 'keep_overdue', rotationMemberIds: [], slots: [defaultSlot], title: '', recurrenceConfig: { version: 1 }, recurrenceType: 'one_time', seriesType: 'one_time', ...initial,
  } as TaskFormValues
}

export function TaskForm({ categories, initialValue, members, onSave }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() => defaultValues(initialValue))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  function update(next: Partial<TaskFormValues>) { setValues((current) => ({ ...current, ...next }) as TaskFormValues) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null)
    const parsed = taskFormSchema.safeParse(values)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the task details.'); return }
    setSaving(true)
    try { await onSave(parsed.data) } catch (reason) { setError(reason instanceof Error ? reason.message : 'The task could not be saved.') } finally { setSaving(false) }
  }
  function updateSlot(index: number, next: ScheduleSlotInput) { update({ slots: values.slots.map((item, itemIndex) => itemIndex === index ? next : item) }) }
  return (
    <form className="space-y-5 rounded-panel border border-border bg-surface p-5 sm:p-6" onSubmit={(event) => void submit(event)}>
      <div>
        <p className="text-sm font-semibold text-brand">New household task</p>
        <h2 className="mt-1 text-xl font-bold">What needs doing?</h2>
      </div>

      <label className="block text-sm font-semibold">
        Task title
        <input autoFocus className="mt-1.5 min-h-12 w-full rounded-control border px-3.5 text-base" onChange={(event) => update({ title: event.target.value })} placeholder="e.g. Water the plants" required value={values.title} />
      </label>

      <section className="space-y-4 rounded-panel bg-canvas p-4" aria-labelledby="schedule-section-title">
        <div>
          <h3 className="font-semibold" id="schedule-section-title">Schedule</h3>
          <p className="mt-0.5 text-sm text-muted">Choose when this task first appears.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Schedule type
            <select className="mt-1.5 min-h-11 w-full rounded-control border px-3" onChange={(event) => { const recurrenceType = event.target.value as TaskFormValues['recurrenceType']; update(recurrenceType === 'one_time' ? { recurrenceConfig: { version: 1 }, recurrenceType, seriesType: 'one_time' } : recurrenceType === 'calendar' ? { recurrenceConfig: { frequency: 'daily', version: 1 }, recurrenceType, seriesType: 'recurring' } : { recurrenceConfig: { intervalMinutes: 480, version: 1 }, recurrenceType, seriesType: 'recurring' }) }} value={values.recurrenceType}>
              <option value="one_time">One time</option>
              <option value="calendar">Repeating schedule</option>
              <option value="completion_interval">After completion</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            First due date
            <input className="mt-1.5 min-h-11 w-full rounded-control border px-3" onChange={(event) => update({ effectiveFrom: event.target.value })} required type="date" value={values.effectiveFrom} />
          </label>
        </div>
        <ScheduleFields onChange={(recurrenceConfig) => update({ recurrenceConfig } as Partial<TaskFormValues>)} recurrenceType={values.recurrenceType} value={values.recurrenceConfig} />
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Time or window</legend>
          {values.slots.map((currentSlot, index) => (
            <div className="rounded-control bg-surface p-3" key={index}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input checked={currentSlot.isAllDay} onChange={(event) => updateSlot(index, { ...currentSlot, endTime: event.target.checked ? undefined : '09:15', isAllDay: event.target.checked, startTime: event.target.checked ? undefined : '09:00' })} type="checkbox" />All day</label>
                {values.slots.length > 1 && <button className="min-h-11 rounded-control px-2 text-sm font-semibold text-danger hover:bg-danger/10" onClick={() => update({ slots: values.slots.filter((_, slotIndex) => slotIndex !== index) })} type="button">Remove</button>}
              </div>
              {!currentSlot.isAllDay && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">Start<input className="mt-1 min-h-11 w-full rounded-control border px-3" onChange={(event) => updateSlot(index, { ...currentSlot, startTime: event.target.value })} required type="time" value={currentSlot.startTime} /></label>
                  <label className="block text-sm font-semibold">End <span className="font-normal text-muted">(optional)</span><input className="mt-1 min-h-11 w-full rounded-control border px-3" onChange={(event) => updateSlot(index, { ...currentSlot, endTime: event.target.value || undefined })} type="time" value={currentSlot.endTime ?? ''} /></label>
                </div>
              )}
            </div>
          ))}
          {values.slots.length < 12 && <Button onClick={() => update({ slots: [...values.slots, defaultSlot] })} type="button" variant="secondary"><Icon name="plus" size={17} /> Add another time</Button>}
        </fieldset>
      </section>

      <section className="rounded-panel bg-canvas p-4">
        <AssignmentFields members={members} onChange={update} values={values} />
      </section>

      <details className="group rounded-panel border border-border">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 font-semibold">
          More options
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <label className="block text-sm font-semibold">Description <span className="font-normal text-muted">(optional)</span><textarea className="mt-1.5 min-h-20 w-full rounded-control border px-3 py-2" onChange={(event) => update({ description: event.target.value })} value={values.description} /></label>
          <label className="block text-sm font-semibold">Category<select className="mt-1.5 min-h-11 w-full rounded-control border px-3" onChange={(event) => update({ categoryId: event.target.value })} value={values.categoryId}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input checked={values.confirmationRequired} onChange={(event) => update({ confirmationRequired: event.target.checked })} type="checkbox" />Ask for confirmation before completing</label>
        </div>
      </details>

      {error && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
      <Button className="w-full sm:w-auto" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save task'}</Button>
    </form>
  )
}
