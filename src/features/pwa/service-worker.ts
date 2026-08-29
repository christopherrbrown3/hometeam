/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { notificationContent, notificationTarget, parsePushPayload } from './pushPayload'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('message', (event) => {
  const data: unknown = event.data
  if (data && typeof data === 'object' && 'type' in data && data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function readPushPayload(event: PushEvent) {
  if (!event.data) return {}

  try {
    return parsePushPayload(event.data.json())
  } catch {
    return {}
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  const content = notificationContent(payload)
  event.waitUntil(self.registration.showNotification(content.title, {
    badge: 'pwa-192x192.png',
    body: content.body,
    data: payload.occurrenceId ? { occurrenceId: payload.occurrenceId } : {},
    icon: 'pwa-192x192.png',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data: unknown = event.notification.data
  const occurrenceId = data && typeof data === 'object' && 'occurrenceId' in data && typeof data.occurrenceId === 'string'
    ? data.occurrenceId
    : null
  const target = notificationTarget(self.registration.scope, occurrenceId ?? undefined)

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    const existing = windows.find((client): client is WindowClient => 'focus' in client)
    if (existing) {
      await existing.navigate(target)
      await existing.focus()
      return
    }
    await self.clients.openWindow(target)
  })())
})
