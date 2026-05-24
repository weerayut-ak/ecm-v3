// app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET: list all appointments ─────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── POST: create appointment + auto-notify ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { title, date, time, location, description } = body
  if (!title || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({ title, date, time: time ?? null, location: location ?? null, description: description ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-send push notification to all students
  try {
    const notifyRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/appointments/notify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      }
    )
    const notifyData = await notifyRes.json().catch(() => ({}))
    return NextResponse.json({ appointment, notified: notifyData.sent ?? 0 })
  } catch {
    // notification failure is non-fatal
    return NextResponse.json({ appointment, notified: 0 })
  }
}

// ── DELETE: remove appointment ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}