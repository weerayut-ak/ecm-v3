'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Eye, EyeOff, BookOpen, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); setLoading(false); return }
    toast.success('เข้าสู่ระบบสำเร็จ!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left branding – desktop */}
      <div className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-10"
        style={{ background: 'var(--blue)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen size={20} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>English Class</span>
        </div>
        <div>
          <h2 style={{ color: 'white', fontSize: 34, fontWeight: 700, lineHeight: 1.25, marginBottom: 12 }}>
            ระบบจัดการ<br />ห้องเรียน<br />ภาษาอังกฤษ
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7 }}>
            นักเรียน ม.1–3 · สื่อการสอน<br />
            แบบทดสอบ · ประกาศ · คะแนน
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['จัดการนักเรียนอย่างเป็นระบบ', 'แบบทดสอบออนไลน์พร้อม Timer', 'ส่งออกคะแนน Excel / CSV'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.6)' }} />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div style={{ width: '100%', maxWidth: 400 }} className="fade-up">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div style={{ width: 36, height: 36, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} color="white" />
            </div>
            <span style={{ fontWeight: 700 }}>English Class Manager</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>ยินดีต้อนรับ 👋</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">อีเมล</label>
              <input type="email" className="input" placeholder="your@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">รหัสผ่าน</label>
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} className="input" style={{ paddingRight: 40 }}
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShow(!show)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? <><div className="spinner" /> กำลังเข้าสู่ระบบ...</> : <>เข้าสู่ระบบ <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 20 }}>
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>ลงทะเบียน</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
