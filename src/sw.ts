/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

// Workbox precaching — manifest injecté par vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)

// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; tag?: string; url?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'VillaHub', body: event.data?.text() ?? 'Nouvelle notification' }
  }
  const opts = {
    body: data.body ?? 'Nouvelle notification',
    icon: '/icon-192.png',
    tag: data.tag ?? 'villahub-booking',
    renotify: true,
    data: { url: data.url ?? '/reservations' },
  } as NotificationOptions
  event.waitUntil(self.registration.showNotification(data.title ?? 'VillaHub', opts))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/reservations'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          (client as WindowClient).navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
