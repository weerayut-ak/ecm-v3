'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, BookOpen, ClipboardList, Megaphone, Play } from 'lucide-react'

const FEATURES = [
  { icon: BookOpen,     label: 'จัดการนักเรียนอย่างเป็นระบบ' },
  { icon: ClipboardList, label: 'แบบทดสอบออนไลน์พร้อม Timer' },
  { icon: Megaphone,    label: 'ระบบประกาศและแจ้งเตือน' },
  { icon: Play,         label: 'สื่อการสอนและวิดีโอ' },
]

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
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between flex-shrink-0 p-12"
        style={{
          width: 420,
          background: 'rgba(241,243,255,0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '40px 0 80px rgba(20,27,43,0.03)',
          position: 'relative', overflow: 'hidden',
        }}>

        {/* Decorative blob */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 300, height: 300,
          background: 'rgba(0,102,255,0.08)', borderRadius: '50%', filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 250, height: 250,
          background: 'rgba(63,225,253,0.1)', borderRadius: '50%', filter: 'blur(50px)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'linear-gradient(135deg, #0050cb 0%, #0066ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0,80,203,0.3)',
          }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#0050cb', letterSpacing: '-0.03em' }}>The Scholar</div>
            <div style={{ fontSize: 11, color: 'var(--outline)', fontWeight: 600 }}>V3 Desktop</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ position: 'relative' }}>
          <p style={{
            display: 'inline-block', padding: '5px 14px', borderRadius: 99,
            background: 'rgba(0,80,203,0.1)', color: 'var(--primary)',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20,
          }}>ระบบจัดการห้องเรียน</p>

          <h2 style={{
            fontSize: 42, fontWeight: 900, lineHeight: 1.15, marginBottom: 16,
            letterSpacing: '-0.04em', color: 'var(--on-surface)',
          }}>
            ระบบจัดการ<br />ห้องเรียน<br />
            <span className="text-gradient">ภาษาอังกฤษ</span>
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.8 }}>
            นักเรียน ม.1–3 · สื่อการสอน · แบบทดสอบ · ประกาศ
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(20,27,43,0.06)',
              }}>
                <Icon size={16} color="var(--primary)" />
              </div>
              <span style={{ fontSize: 13.5, color: 'var(--on-surface-variant)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="fade-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#0050cb,#0066ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,80,203,0.3)' }}>
              <BookOpen size={18} color="white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#0050cb', letterSpacing: '-0.02em' }}>The Scholar</span>
          </div>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>Student Dashboard</p>
            <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>ยินดีต้อนรับ 👋</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, fontWeight: 500 }}>กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--surface-lowest)',
            borderRadius: 'var(--r-2xl)',
            padding: 32,
            boxShadow: 'var(--shadow-md)',
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="form-label">อีเมล</label>
                <input type="email" className="input" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ borderRadius: 'var(--r-lg)' }} />
              </div>
              <div>
                <label className="form-label">รหัสผ่าน</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} className="input"
                    style={{ paddingRight: 48, borderRadius: 'var(--r-lg)' }}
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShow(!show)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex' }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading
                  ? <><div className="spinner" /> กำลังเข้าสู่ระบบ...</>
                  : <>เข้าสู่ระบบ <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--outline)', marginTop: 20, fontWeight: 500 }}>
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>ลงทะเบียน</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
