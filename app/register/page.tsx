'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

const GRADES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3']

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email:'', password:'', full_name:'', nickname:'', student_id:'', grade: GRADES[0] })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.full_name } } })
    if (error || !data.user) { toast.error(error?.message ?? 'เกิดข้อผิดพลาด'); setLoading(false); return }
    await supabase.from('profiles').update({ full_name: form.full_name, nickname: form.nickname, student_id: form.student_id, grade: form.grade }).eq('id', data.user.id)
    toast.success('ลงทะเบียนสำเร็จ!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="fade-up">
        <div className="flex items-center gap-2 mb-6">
          <div style={{ width: 36, height: 36, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="white" />
          </div>
          <span style={{ fontWeight: 700 }}>English Class Manager</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>ลงทะเบียนนักเรียน</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>กรอกข้อมูลเพื่อสร้างบัญชี</p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label className="form-label">ชื่อ-สกุล *</label><input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="นาย สมชาย ใจดี" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="form-label">ชื่อเล่น</label><input className="input" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="เจมส์" /></div>
              <div><label className="form-label">รหัสนักเรียน</label><input className="input" value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="M101" /></div>
            </div>
            <div><label className="form-label">ระดับชั้น</label>
              <select className="input" value={form.grade} onChange={e => set('grade', e.target.value)}>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="form-label">อีเมล *</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="student@school.ac.th" /></div>
            <div><label className="form-label">รหัสผ่าน *</label><input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} placeholder="อย่างน้อย 6 ตัวอักษร" /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <><div className="spinner" /> กำลังลงทะเบียน...</> : 'ลงทะเบียน'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
              <ArrowLeft size={14} /> กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
