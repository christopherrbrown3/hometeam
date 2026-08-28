import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { readVapidPublicKey } from '../../lib/env'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import {
  disableCurrentPushDevice,
  enablePushNotifications,
  getCurrentPushDevice,
  getServiceWorkerRegistration,
} from '../notifications/subscriptionService'

function isInstalledPwa() {
  return (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function notificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

export function InstallSettings() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user.id
  const [permission, setPermission] = useState(notificationPermission)
  const installed = isInstalledPwa()
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const currentDevice = useQuery({
    enabled: Boolean(userId) && pushSupported,
    queryFn: async () => getCurrentPushDevice(supabase, userId!, await getServiceWorkerRegistration()),
    queryKey: userId ? [...queryKeys.pushSubscriptions(userId), 'current'] : ['push-subscriptions', 'signed-out', 'current'],
  })
  const refreshDevices = async () => {
    setPermission(notificationPermission())
    await queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions(userId!) })
  }
  const enable = useMutation({
    mutationFn: () => enablePushNotifications(supabase, userId!, readVapidPublicKey()),
    onSettled: refreshDevices,
  })
  const disable = useMutation({
    mutationFn: async () => disableCurrentPushDevice(supabase, userId!, await getServiceWorkerRegistration()),
    onSettled: refreshDevices,
  })

  const status = !pushSupported
    ? 'Not supported in this browser'
    : currentDevice.data?.enabled
      ? 'Notifications enabled on this device'
      : permission === 'denied'
        ? 'Permission blocked in browser settings'
        : 'Notifications are off on this device'

  return (
    <details className="settings-panel group">
      <summary className="settings-panel-header">
        <span className="settings-panel-icon"><Icon name="home" size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="settings-panel-title">Install HomeTeam</span>
          <span className="settings-panel-description block">{installed ? 'Running from your Home Screen' : 'Keep it handy on your Home Screen'}</span>
        </span>
        <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
      </summary>
      <div className="settings-panel-content space-y-5 border-t border-border pt-4">
        <section className="space-y-2" aria-labelledby="install-heading">
          <h3 className="font-semibold" id="install-heading">{installed ? 'HomeTeam is installed' : 'Add HomeTeam to your Home Screen'}</h3>
          {!installed && isAppleMobile() && <ol className="list-decimal space-y-1 pl-5 text-sm text-muted"><li>Open HomeTeam in Safari.</li><li>Tap Share.</li><li>Choose “Add to Home Screen,” then Add.</li></ol>}
          {!installed && !isAppleMobile() && <p className="text-sm text-muted">Open your browser’s install menu and choose “Install app” or “Add to Home Screen.”</p>}
          <p className="text-xs text-muted">The app shell can be viewed offline, but shared task changes always require a connection and are never queued.</p>
        </section>

        <section className="space-y-3 border-t border-border pt-4" aria-labelledby="device-notifications-heading">
          <div>
            <h3 className="font-semibold" id="device-notifications-heading">This device</h3>
            <p className="text-sm text-muted">{currentDevice.isPending ? 'Checking notification status…' : status}</p>
          </div>
          {isAppleMobile() && !installed && <p className="rounded-control bg-warning/10 p-3 text-sm">Install HomeTeam first. iPhone allows web push permission only from an installed Home Screen app.</p>}
          {currentDevice.data?.enabled
            ? <Button disabled={disable.isPending} onClick={() => disable.mutate()} requiresOnline variant="secondary">{disable.isPending ? 'Disabling…' : 'Disable on this device'}</Button>
            : <Button disabled={!pushSupported || permission === 'denied' || (isAppleMobile() && !installed) || enable.isPending} onClick={() => enable.mutate()} requiresOnline>{enable.isPending ? 'Enabling…' : 'Enable notifications'}</Button>}
          {(enable.isError || disable.isError || currentDevice.isError) && <p className="text-sm text-danger" role="alert">{enable.error?.message ?? disable.error?.message ?? currentDevice.error?.message}</p>}
          <p className="text-xs text-muted">HomeTeam notifications are coordination aids and should not be the sole reminder for medication or other safety-critical tasks.</p>
        </section>
      </div>
    </details>
  )
}
