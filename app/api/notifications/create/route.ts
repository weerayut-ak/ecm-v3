import { NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { sendPushToUsers } from '@/lib/webpush'

// web-push ต้องการ Node.js runtime (ไม่รัน Edge)
export const runtime = 'nodejs'

// Service-role client (bypass RLS)
function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type NotificationType = 'quiz_submission' | 'new_quiz' | 'new_announcement'

export interface CreateNotificationPayload {
  type: NotificationType
  title: string
  body?: string
  link?: string
  metadata?: Record<string, unknown>
  user_ids?: string[]
  target_role?: 'admin' | 'student'
}

export async function POST(req: Request) {
  try {
    const payload: CreateNotificationPayload = await req.json()
    const supabase = adminClient()

    let userIds: string[] = payload.user_ids ?? []

    if (payload.target_role && userIds.length === 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', payload.target_role)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      userIds = (profiles ?? []).map((p: { id: string }) => p.id)
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 })
    }

    // 1️⃣ บันทึก in-app notifications
    const rows = userIds.map((user_id) => ({
      user_id,
      type:     payload.type,
      title:    payload.title,
      body:     payload.body ?? null,
      link:     payload.link ?? null,
      metadata: payload.metadata ?? {},
      is_read:  false,
    }))

    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // 2️⃣ ส่ง Web Push (fire-and-forget ไม่ block response)
    sendPushToUsers(supabase, userIds, {
      title: payload.title,
      body:  payload.body,
      link:  payload.link,
    }).catch(() => { /* ไม่ crash ถ้า push ล้มเหลว */ })

    return NextResponse.json({ success: true, inserted: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
