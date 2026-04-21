import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { user_id, password } = await req.json()
    if (!user_id || !password) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }
    const supabase = await createServiceClient()
    const { error } = await supabase.auth.admin.updateUserById(user_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}