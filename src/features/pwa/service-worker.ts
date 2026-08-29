/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

type HomeTeamPushPayload = Readonly<{
  body?: string
  occurrenceId?: string
  title?: string
}>

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

function readPushPayload(event: PushEvent): HomeTeamPushPayload {
  if (!event.data) return {}

  try {
    const value: unknown = event.data.json()
    if (!value || typeof value !== 'object') return {}
    const record = value as Record<string, unknown>
    return {
      body: typeof record.body === 'string' ? record.body : undefined,
      occurrenceId: typeof record.occurrenceId === 'string' ? record.occurrenceId : undefined,
      title: typeof record.title === 'string' ? record.title : undefined,
    }
  } catch {
    return {}
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  event.waitUntil(self.registration.showNotification(payload.title ?? 'Household task update', {
    badge: 'pwa-192x192.png',
    body: payload.body ?? 'Open HomeTeam to see the latest authorized task details.',
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
  const target = new URL(occurrenceId ? `#/today?occurrence=${encodeURIComponent(occurrenceId)}` : '#/today', self.registration.scope).href

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
