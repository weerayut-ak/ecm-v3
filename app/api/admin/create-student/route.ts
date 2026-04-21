import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, password, full_name, nickname, student_id, grade } = await req.json()
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    const supabase = await createServiceClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, nickname, student_id, grade }
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('profiles').upsert({
      id: data.user.id, full_name, nickname, student_id, grade, role: 'student'
    })
    return NextResponse.json({ success: true, user: data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}