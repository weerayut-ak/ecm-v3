// lib/webpush.ts — ส่ง Web Push notification จาก server (Node.js only)
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let configured = false

function configure(): boolean {
  if (configured) return true
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:admin@school.com'

  if (!pub || !priv) {
    console.warn('[webpush] VAPID keys ไม่ครบ — ตั้งค่า .env.local ก่อน')
    return false
  }
  webpush.setVapidDetails(subj, pub, priv)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body?:  string
  link?:  string
  icon?:  string
}

export interface PushSubscriptionRow {
  id:       string
  endpoint: string
  p256dh:   string
  auth_key: string
}

/** ส่ง push ไปยัง 1 subscription — คืน false ถ้าหมดอายุ (ให้ลบออก) */
export async function sendOnePush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<boolean> {
  if (!configure()) return true   // ถ้า VAPID ไม่ครบ อย่าลบ subscription

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify({ title: payload.title, body: payload.body ?? '', link: payload.link ?? '/dashboard' }),
    )
    return true
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status
    if (status === 410 || status === 404) {
      console.log('[webpush] subscription หมดอายุ endpoint:', sub.endpoint.slice(0, 40))
      return false   // หมดอายุ → ให้ลบ
    }
    console.error('[webpush] error status:', status, err?.message)
    return true      // error อื่น ไม่ลบ
  }
}

/** ส่ง push ให้ user_ids ทั้งหมด + ลบ subscription หมดอายุ */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds:  string[],
  payload:  PushPayload,
) {
  if (!userIds.length) return
  if (!configure()) return

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .in('user_id', userIds)

  if (error) { console.error('[webpush] ดึง subscriptions ไม่ได้:', error.message); return }
  if (!subs?.length) { console.log('[webpush] ไม่มี subscription สำหรับ', userIds); return }

  console.log(`[webpush] ส่ง push ${subs.length} subscriptions`)

  const results = await Promise.allSettled(subs.map((s) => sendOnePush(s, payload)))

  const expiredIds = subs
    .filter((_, i) => results[i].status === 'fulfilled' && (results[i] as PromiseFulfilledResult<boolean>).value === false)
    .map((s) => s.id)

  if (expiredIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
    console.log('[webpush] ลบ subscription หมดอายุ:', expiredIds.length)
  }
}
