// app/api/appointments/notify/route.ts
//
// ส่งการแจ้งเตือน "วันนัดหมายใหม่" ไปยังนักเรียนทุกคน
// รองรับทั้ง: เรียกจาก client (มี user session) และ internal server-to-server (ไม่มี session)
//
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
}

// service-role client สำหรับดึงข้อมูล appointment
function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    // ── ตรวจสิทธิ์: admin session หรือ internal secret header ──────────────────
    const internalSecret = req.headers.get('x-internal-secret')
    const isInternal = internalSecret === process.env.INTERNAL_API_SECRET

    if (!isInternal) {
      // ตรวจ user session ปกติ
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { appointmentId } = body
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })
    }

    // ดึงข้อมูลวันนัด (ใช้ service-role เสมอ)
    const supabaseAdmin = adminClient()
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appt) {
      return NextResponse.json({ error: 'appointment not found' }, { status: 404 })
    }

    const dateStr = formatThaiDate(appt.date)
    const bodyText = [
      dateStr,
      appt.time ? `เวลา ${appt.time} น.` : null,
      appt.location ? `📍 ${appt.location}` : null,
    ].filter(Boolean).join(' · ')

    const notifyRes = await fetch(`${req.nextUrl.origin}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_appointment',
        title: `📅 วันนัดหมายใหม่: ${appt.title}`,
        body: bodyText,
        link: '/dashboard',
        metadata: { appointment_id: appt.id },
        target_role: 'student',
      }),
    })

    const rawText = await notifyRes.text()
    console.error('[notify] /api/notifications response:', notifyRes.status, rawText)

    let notifyData: any = {}
    try { notifyData = JSON.parse(rawText) } catch {}

    if (!notifyRes.ok) {
    return NextResponse.json(
        { error: notifyData.error ?? rawText ?? 'notification send failed' },
        { status: 500 }
    )
    }

    return NextResponse.json({ sent: notifyData.inserted ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}