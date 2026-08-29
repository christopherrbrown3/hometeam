import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '../../types/database'
import { requireOnline } from '../pwa/onlineState'

type HomeTeamClient = SupabaseClient<Database>

const serializedSubscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    auth: z.string().trim().min(1).max(1024),
    p256dh: z.string().trim().min(1).max(1024),
  }),
})

export type PushDevice = Pick<
  Database['public']['Tables']['push_subscriptions']['Row'],
  'created_at' | 'device_label' | 'disabled_at' | 'enabled' | 'id' | 'last_failure_at' | 'last_success_at' | 'updated_at'
>

const safeDeviceColumns = 'id, device_label, enabled, created_at, updated_at, last_success_at, last_failure_at, disabled_at'

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const decoded = window.atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

export function currentDeviceLabel(userAgent = navigator.userAgent) {
  if (/iPhone/i.test(userAgent)) return 'iPhone Home Screen'
  if (/iPad/i.test(userAgent)) return 'iPad Home Screen'
  if (/Android/i.test(userAgent)) return 'Android device'
  if (/Macintosh/i.test(userAgent)) return 'Mac browser'
  if (/Windows/i.test(userAgent)) return 'Windows browser'
  return 'Web browser'
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.')
  }
  return navigator.serviceWorker.ready
}

export async function listPushDevices(client: HomeTeamClient, userId: string): Promise<PushDevice[]> {
  const { data, error } = await client
    .from('push_subscriptions')
    .select(safeDeviceColumns)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as PushDevice[]
}

export async function getCurrentPushDevice(
  client: HomeTeamClient,
  userId: string,
  registration: ServiceWorkerRegistration,
): Promise<PushDevice | null> {
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const { data, error } = await client
    .from('push_subscriptions')
    .select(safeDeviceColumns)
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()
  if (error) throw error
  return data as PushDevice | null
}

export async function enablePushNotifications(
  client: HomeTeamClient,
  userId: string,
  vapidPublicKey: string | undefined,
): Promise<PushDevice> {
  requireOnline()
  if (!('Notification' in window)) throw new Error('Notifications are not supported by this browser.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')
  if (!vapidPublicKey?.trim()) throw new Error('Push notifications are not configured for this deployment.')

  const registration = await getServiceWorkerRegistration()
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
    applicationServerKey: decodeBase64Url(vapidPublicKey.trim()),
    userVisibleOnly: true,
  })
  const serialized = serializedSubscriptionSchema.parse(subscription.toJSON())
  const { data, error } = await client
    .from('push_subscriptions')
    .upsert({
      auth_key: serialized.keys.auth,
      device_label: currentDeviceLabel(),
      disabled_at: null,
      enabled: true,
      endpoint: serialized.endpoint,
      p256dh_key: serialized.keys.p256dh,
      user_id: userId,
    }, { onConflict: 'endpoint' })
    .select(safeDeviceColumns)
    .single()
  if (error) throw error
  return data as PushDevice
}

export async function disablePushDevice(client: HomeTeamClient, userId: string, subscriptionId: string) {
  requireOnline()
  const { data, error } = await client
    .from('push_subscriptions')
    .update({ disabled_at: new Date().toISOString(), enabled: false })
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .select(safeDeviceColumns)
    .single()
  if (error) throw error
  return data as PushDevice
}

export async function disableCurrentPushDevice(
  client: HomeTeamClient,
  userId: string,
  registration: ServiceWorkerRegistration,
) {
  requireOnline()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const { error } = await client
    .from('push_subscriptions')
    .update({ disabled_at: new Date().toISOString(), enabled: false })
    .eq('endpoint', subscription.endpoint)
    .eq('user_id', userId)
  if (error) throw error
  await subscription.unsubscribe()
  return null
}
