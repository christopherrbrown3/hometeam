import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import {
  defaultNotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferencesInput,
} from './preferencesService'
import { disablePushDevice, listPushDevices } from './subscriptionService'

const toggleOptions: ReadonlyArray<Readonly<{
  key: Exclude<keyof NotificationPreferencesInput, 'due_soon_minutes' | 'show_task_details'>
  label: string
}>> = [
  { key: 'notify_assigned', label: 'Newly assigned to me' },
  { key: 'notify_due_soon', label: 'Task due soon' },
  { key: 'notify_overdue', label: 'Task overdue' },
  { key: 'notify_completed', label: 'Task completed' },
  { key: 'notify_skipped', label: 'Task skipped' },
  { key: 'notify_snoozed', label: 'Task snoozed' },
  { key: 'notify_new_task', label: 'New household task' },
  { key: 'notify_membership_changes', label: 'Household member or guest added' },
]

function preferenceInput(value: Awaited<ReturnType<typeof getNotificationPreferences>>): NotificationPreferencesInput {
  return {
    due_soon_minutes: value.due_soon_minutes as NotificationPreferencesInput['due_soon_minutes'],
    notify_assigned: value.notify_assigned,
    notify_completed: value.notify_completed,
    notify_due_soon: value.notify_due_soon,
    notify_membership_changes: value.notify_membership_changes,
    notify_new_task: value.notify_new_task,
    notify_overdue: value.notify_overdue,
    notify_skipped: value.notify_skipped,
    notify_snoozed: value.notify_snoozed,
    show_task_details: value.show_task_details,
  }
}

function NotificationPreferencesForm({ initial, userId }: Readonly<{ initial: NotificationPreferencesInput; userId: string }>) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(initial)
  const save = useMutation({
    mutationFn: (input: NotificationPreferencesInput) => saveNotificationPreferences(supabase, userId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notificationPreferences(data.user_id), data)
    },
  })

  return (
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); save.mutate(draft) }}>
      <fieldset className="space-y-3" disabled={save.isPending}>
        <legend className="mb-2 font-semibold">Notify me when</legend>
        {toggleOptions.map((option) => (
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-border px-3 py-2" key={option.key}>
            <span className="text-sm font-medium">{option.label}</span>
            <input
              checked={draft[option.key]}
              className="h-5 w-5 accent-brand"
              onChange={(event) => setDraft((current) => ({ ...current, [option.key]: event.target.checked }))}
              type="checkbox"
            />
          </label>
        ))}
      </fieldset>
      <label className="block text-sm font-semibold">
        Due-soon lead time
        <select
          className="mt-1 min-h-11 w-full rounded-control border px-3"
          onChange={(event) => setDraft((current) => ({ ...current, due_soon_minutes: Number(event.target.value) as NotificationPreferencesInput['due_soon_minutes'] }))}
          value={draft.due_soon_minutes}
        >
          {[5, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-control border border-border px-3 py-2">
        <input
          checked={draft.show_task_details}
          className="h-5 w-5 accent-brand"
          onChange={(event) => setDraft((current) => ({ ...current, show_task_details: event.target.checked }))}
          type="checkbox"
        />
        <span><span className="block text-sm font-semibold">Show task title and details</span><span className="block text-xs text-muted">Turn this off to show only “Household task update.”</span></span>
      </label>
      <Button disabled={save.isPending} requiresOnline type="submit">{save.isPending ? 'Saving…' : 'Save notification preferences'}</Button>
      {save.isSuccess && <p className="text-sm text-success" role="status">Notification preferences saved.</p>}
      {save.isError && <p className="text-sm text-danger" role="alert">{save.error.message}</p>}
    </form>
  )
}

export function NotificationSettings() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user.id
  const preferences = useQuery({
    enabled: Boolean(userId),
    queryFn: () => getNotificationPreferences(supabase, userId!),
    queryKey: userId ? queryKeys.notificationPreferences(userId) : ['notification-preferences', 'signed-out'],
  })
  const devices = useQuery({
    enabled: Boolean(userId),
    queryFn: () => listPushDevices(supabase, userId!),
    queryKey: userId ? queryKeys.pushSubscriptions(userId) : ['push-subscriptions', 'signed-out'],
  })
  const disableDevice = useMutation({
    mutationFn: (subscriptionId: string) => disablePushDevice(supabase, userId!, subscriptionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions(userId!) })
    },
  })

  return (
    <details className="settings-panel group">
      <summary className="settings-panel-header">
        <span className="settings-panel-icon"><Icon name="clock" size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="settings-panel-title">Notifications</span>
          <span className="settings-panel-description block">
            {preferences.isPending ? 'Loading preferences…' : `Due-soon reminder · ${preferences.data?.due_soon_minutes ?? 30} minutes`}
          </span>
        </span>
        <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
      </summary>
      <div className="settings-panel-content space-y-6 border-t border-border pt-4">
        {preferences.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{preferences.error.message}</p>}
        {!preferences.isError && !preferences.isPending && (
          <NotificationPreferencesForm
            initial={preferences.data ? preferenceInput(preferences.data) : defaultNotificationPreferences}
            key={preferences.data?.updated_at ?? 'defaults'}
            userId={userId!}
          />
        )}

        <section aria-labelledby="push-devices-heading" className="space-y-3">
          <div>
            <h3 className="font-semibold" id="push-devices-heading">Registered devices</h3>
            <p className="text-xs text-muted">Disabling one device does not affect notifications on your others.</p>
          </div>
          {devices.isPending && <p className="text-sm text-muted">Loading devices…</p>}
          {devices.isError && <p className="text-sm text-danger" role="alert">{devices.error.message}</p>}
          {devices.data?.length === 0 && <p className="text-sm text-muted">No devices are registered yet.</p>}
          {devices.data?.map((device) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3" key={device.id}>
              <span>
                <span className="block text-sm font-semibold">{device.device_label ?? 'HomeTeam device'}</span>
                <span className="block text-xs text-muted">{device.enabled ? 'Enabled' : 'Disabled'}</span>
              </span>
              {device.enabled && <Button disabled={disableDevice.isPending} onClick={() => disableDevice.mutate(device.id)} requiresOnline variant="secondary">Disable</Button>}
            </div>
          ))}
        </section>
      </div>
    </details>
  )
}
