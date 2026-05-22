'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X, BellRing } from 'lucide-react'

const DISMISSED_KEY = 'ecm_push_dismissed_v2'

function getVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function registerSW() {
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  // รอ SW พร้อม
  await new Promise<void>((resolve) => {
    if (reg.active) { resolve(); return }
    const sw = reg.installing ?? reg.waiting
    if (!sw) { resolve(); return }
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve() })
    // timeout 5s
    setTimeout(resolve, 5000)
  })
  return reg
}

async function saveSub(sub: PushSubscription) {
  const json = sub.toJSON()
  const res  = await fetch('/api/push/subscribe', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ subscription: { endpoint: sub.endpoint, keys: json.keys } }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `HTTP ${res.status}`)
  }
}

type Status = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export default function PushPermissionBanner() {
  const [status,  setStatus]  = useState<Status>('idle')
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[push] browser ไม่รองรับ Web Push')
      setStatus('unsupported')
      return
    }

    const vapid = getVapidKey()
    if (!vapid || vapid === 'your_vapid_public_key_here') {
      console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY ยังไม่ได้ตั้งค่า')
      return
    }

    const perm = Notification.permission
    console.log('[push] สิทธิ์ปัจจุบัน:', perm)

    if (perm === 'granted') {
      // ลงทะเบียนเงียบๆ ถ้ายังไม่ได้ subscribe
      silentRegister(vapid)
      return
    }

    if (perm === 'denied') return

    // default → แสดง banner (ถ้ายังไม่ dismiss)
    if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true)
  }, [])

  async function silentRegister(vapid: string) {
    try {
      const reg = await registerSW()
      const existing = await reg.pushManager.getSubscription()
      if (existing) { console.log('[push] มี subscription แล้ว'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })
      await saveSub(sub)
      console.log('[push] silent subscribe สำเร็จ')
    } catch (e) {
      console.error('[push] silentRegister error:', e)
    }
  }

  async function handleAllow() {
    const vapid = getVapidKey()
    if (!vapid) return
    setStatus('loading')
    try {
      const reg = await registerSW()
      console.log('[push] SW registered, state:', reg.active?.state)

      const perm = await Notification.requestPermission()
      console.log('[push] สิทธิ์หลังขอ:', perm)
      if (perm !== 'granted') { setStatus('denied'); return }

      // ยกเลิก subscription เก่าก่อน (ป้องกัน key ซ้ำ)
      const old = await reg.pushManager.getSubscription()
      if (old) await old.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })
      console.log('[push] subscribe endpoint:', sub.endpoint.slice(0, 50))

      await saveSub(sub)
      console.log('[push] บันทึก subscription สำเร็จ')
      setStatus('granted')
      setTimeout(() => setVisible(false), 2500)
    } catch (e: any) {
      console.error('[push] handleAllow error:', e)
      setStatus('denied')
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[200] flex justify-center px-4 sm:bottom-6">
      <div
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl"
        role="alertdialog"
      >
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
          {status === 'granted'
            ? <BellRing size={20} className="text-blue-600 animate-bounce" />
            : status === 'denied'
            ? <BellOff  size={20} className="text-slate-400" />
            : <Bell     size={20} className="text-blue-600" />}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {status === 'granted' ? (
            <p className="text-sm font-bold text-green-600">เปิดการแจ้งเตือนแล้ว ✓</p>
          ) : status === 'denied' ? (
            <>
              <p className="text-sm font-bold text-slate-700">ไม่ได้รับอนุญาต</p>
              <p className="mt-0.5 text-xs text-slate-400">
                เปิดได้ที่ Settings → Notifications ของเบราว์เซอร์
              </p>
              <button onClick={handleDismiss} className="mt-2 text-xs text-blue-600 underline">ปิด</button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700">รับแจ้งเตือนบนอุปกรณ์นี้</p>
              <p className="mt-0.5 text-xs text-slate-400">
                แจ้งเมื่อมีประกาศใหม่หรือแบบทดสอบ แม้ไม่ได้เปิดแอป
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAllow}
                  disabled={status === 'loading'}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      กำลังเปิด...
                    </span>
                  ) : (
                    <><Bell size={12} />อนุญาต</>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200"
                >
                  ไม่ใช่ตอนนี้
                </button>
              </div>
            </>
          )}
        </div>

        {/* X */}
        {status !== 'granted' && (
          <button onClick={handleDismiss} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-500">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
