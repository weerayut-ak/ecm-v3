import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของผู้ใช้ที่ต้องการลบ' }, { status: 400 })
    }
    
    // สร้างกุญแจมาสเตอร์ ทะลุ RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // 1. ลบจากตาราง profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id)
    if (profileError) {
      console.error('Profile delete error:', profileError)
    }

    // 2. ลบออกจากระบบ Auth ถาวร
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) {
      return NextResponse.json({ error: `ลบบัญชี Auth ไม่สำเร็จ: ${authError.message}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
    
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}