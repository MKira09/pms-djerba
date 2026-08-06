self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'VillaHub', body: event.data?.text() ?? 'Nouvelle notification' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'VillaHub', {
      body: data.body ?? 'Nouvelle notification',
      icon: '/icon-192.png',
      tag: data.tag ?? 'villahub-booking',
      renotify: true,
      data: { url: data.url ?? '/reservations' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/reservations'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
