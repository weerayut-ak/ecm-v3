import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, password, full_name, nickname, student_id, grade } = await req.json()
    
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    
    // 🌟 สร้าง Supabase Client ด้วย Service Role Key (กุญแจมาสเตอร์สำหรับ Admin ทะลุ RLS)
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
    
    // 1. สร้างบัญชีในระบบ Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, nickname, student_id, grade }
    })
    
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 2. บันทึกข้อมูลลง Profile (ตอนนี้จะทะลุ RLS ได้แล้วเพราะใช้ supabaseAdmin)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id, 
      full_name: full_name, 
      nickname: nickname || null, 
      student_id: student_id || null, 
      grade: grade || null, 
      role: 'student'
    }, {
      onConflict: 'id'
    })

    if (profileError) {
      return NextResponse.json({ error: `บันทึก Profile ไม่สำเร็จ: ${profileError.message}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data.user })
    
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}