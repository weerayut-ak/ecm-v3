import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'

function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── GET: ดึง notifications ของ user ปัจจุบัน ─────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ notifications: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── POST: สร้าง notifications แบบ bulk (server-to-server, ใช้ service-role) ───
export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const supabase = adminClient()

    const { type, title, body, link, metadata, user_ids, target_role } = payload

    let userIds: string[] = user_ids ?? []

    // ถ้าไม่ระบุ user_ids ให้ดึงตาม target_role
    if (target_role && userIds.length === 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', target_role)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      userIds = (profiles ?? []).map((p: { id: string }) => p.id)
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 })
    }

    const rows = userIds.map((user_id) => ({
      user_id,
      type:     type,
      title:    title,
      body:     body ?? null,
      link:     link ?? null,
      metadata: metadata ?? {},
      is_read:  false,
    }))

    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, inserted: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}