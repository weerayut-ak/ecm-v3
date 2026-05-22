// public/sw.js — Service Worker สำหรับ Web Push Notification
// Next.js จะ serve ไฟล์นี้ที่ /sw.js โดยอัตโนมัติ

const APP_ORIGIN = self.location.origin

// ── รับ push event จาก server ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'ECM แจ้งเตือน', body: '', link: '/dashboard', icon: '/icon-192.png' }

  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  const options = {
    body:    data.body || '',
    icon:    data.icon || '/icon-192.png',
    badge:   '/icon-72.png',
    tag:     data.link || 'ecm-noti',        // group notifications by link
    renotify: true,
    data:    { link: data.link || '/dashboard' },
    actions: [
      { action: 'open',    title: 'เปิดดู' },
      { action: 'dismiss', title: 'ปิด'   },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ── คลิกที่ notification ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = APP_ORIGIN + (event.notification.data?.link ?? '/dashboard')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ถ้า tab ที่เปิดอยู่แล้ว → focus
      for (const client of clientList) {
        if (client.url.startsWith(APP_ORIGIN) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // ถ้ายังไม่มี tab เปิดอยู่ → เปิดใหม่
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})

// ── activate: claim clients ทันที ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
