'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Script from 'next/script'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

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
    // ล็อคความสูง 100vh และตัดส่วนเกินออก (overflow: hidden)
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', background: 'var(--bg)' }}>
      <Script 
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js" 
        strategy="lazyOnload" 
        type="module" 
      />

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col items-center flex-shrink-0 text-center p-8"
        style={{
          width: 480,
          background: 'rgba(241,243,255,0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '40px 0 80px rgba(20,27,43,0.03)',
          position: 'relative', overflow: 'hidden',
          justifyContent: 'space-between' // กระจายระยะห่างบน กลาง ล่าง อัตโนมัติ
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

        {/* ส่วนบน: Logo Section (ลดขนาดลงเล็กน้อย) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 10, marginTop: '2vh' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: '120px', height: '120px', objectFit: 'contain' }} 
          />
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#111827', letterSpacing: '-0.03em' }}>The Scholar</div>
          </div>
        </div>

        {/* ส่วนกลาง: Lottie Animation (ใช้ flex: 1 เพื่อให้มันยืดหยุ่นตามพื้นที่ที่เหลือ) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%', zIndex: 10 }}>
          {/* @ts-ignore */}
          <dotlottie-wc 
            src="https://lottie.host/5c83d2ab-60df-40e9-899f-74558417cebc/fTT7PPylWr.lottie" 
            style={{ width: '100%', maxWidth: '280px', maxHeight: '280px', objectFit: 'contain' }} 
            autoplay 
            loop
          ></dotlottie-wc>
        </div>

        {/* ส่วนล่าง: Hero Text (ลดระยะ margin) */}
        <div style={{ position: 'relative', zIndex: 10, marginBottom: '2vh' }}>
          <h2 style={{
            fontSize: 32, fontWeight: 900, lineHeight: 1.2, marginBottom: 8,
            letterSpacing: '-0.04em', color: 'var(--on-surface)',
          }}>
            ระบบจัดการห้องเรียน<br />
            <span className="text-gradient">ภาษาอังกฤษ</span>
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.5, maxWidth: '280px', margin: '0 auto' }}>
            ครบจบในที่เดียว ยกระดับการเรียนการสอนของคุณให้สมาร์ทยิ่งขึ้น
          </p>
        </div>
      </div>

      {/* ── Right form ── */}
      {/* เพิ่ม overflowY: 'auto' เผื่อไว้กรณีหน้าจอเล็กมากๆ ฟอร์มจะได้เลื่อนในตัวมันเองได้โดยไม่ทะลุกรอบ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="fade-up">

          {/* Mobile logo */}
          <div className="flex flex-col items-center justify-center gap-2 mb-6 lg:hidden">
            <img 
              src="/logo.png" 
              alt="The Scholar Logo" 
              style={{ width: '120px', height: '120px', objectFit: 'contain' }} 
            />
            <span style={{ fontWeight: 900, fontSize: 20, color: '#111827', letterSpacing: '-0.02em', textAlign: 'center' }}>
              The Scholar
            </span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6 }}>Student Dashboard</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>ยินดีต้อนรับ </h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, fontWeight: 500 }}>กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--surface-lowest)',
            borderRadius: 'var(--r-2xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" style={{ marginBottom: '6px' }}>อีเมล</label>
                <input type="email" className="input" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ borderRadius: 'var(--r-lg)' }} />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '6px' }}>รหัสผ่าน</label>
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
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
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