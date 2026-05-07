'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function UnderConstruction() {
  const router = useRouter()
  const [dots, setDots] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => p >= 72 ? 72 : p + 0.4)
    }, 40)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (document.querySelector('script[data-lottie-wc]')) return
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js'
    s.type = 'module'
    s.setAttribute('data-lottie-wc', '1')
    document.head.appendChild(s)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
      padding: '20px',
    }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .uc-card { animation: fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .uc-lottie-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .uc-lottie-wrap::after {
          content: '';
          position: absolute;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(0,80,203,0.12);
          animation: pulse-ring 2.2s ease-out infinite;
          pointer-events: none;
        }
        .uc-progress-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #0050cb, #60a5fa, #0066ff);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
          transition: width 0.4s ease;
        }
        .uc-back-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .uc-back-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,80,203,0.3) !important;
        }
        .uc-back-btn:active { transform: scale(0.97); }
        @media (max-width: 480px) {
          .uc-title      { font-size: 26px !important; }
          .uc-card-inner { padding: 32px 24px !important; }
        }
      `}</style>

      <div className="uc-card" style={{ width: '100%', maxWidth: 460 }}>
        <div
          className="uc-card-inner"
          style={{
            background: 'var(--surface-lowest)',
            borderRadius: 'var(--r-2xl)',
            padding: '40px 40px 36px',
            boxShadow: '0 20px 60px rgba(20,27,43,0.08), 0 4px 16px rgba(20,27,43,0.04)',
            border: '1px solid var(--surface-highest)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, background:'radial-gradient(circle, rgba(0,80,203,0.05) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, left:-40, width:160, height:160, background:'radial-gradient(circle, rgba(67,69,209,0.04) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

          <div className="uc-lottie-wrap">
            {/* @ts-ignore */}
            <dotlottie-wc
              src="https://lottie.host/75a58fd3-54d5-44d3-93da-098b4e22e305/zeOvICyNza.lottie"
              style={{ width: 220, height: 220 }}
              autoplay
              loop
            />
          </div>

          <h1
            className="uc-title"
            style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--on-surface)', lineHeight: 1.2, marginBottom: 10 }}
          >
            กำลังพัฒนาระบบ
          </h1>

          <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.75, margin: '0 auto 28px', maxWidth: 300 }}>
            หน้านี้อยู่ระหว่างการพัฒนา<br />จะพร้อมใช้งานเร็วๆ นี้ครับ
          </p>

          <p style={{ fontSize:12, color:'var(--outline)', margin:'8px 0 28px', fontWeight:500, minHeight:18 }}>
            กำลังสร้าง{'.'.repeat(dots)}
          </p>

          <div style={{ width:'100%', height:1, background:'var(--surface-highest)', marginBottom:24 }} />

          <button
            className="uc-back-btn"
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '13px 32px', borderRadius: 'var(--r-full)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              color: 'white', fontFamily: 'var(--font)', fontWeight: 800,
              fontSize: 14, cursor: 'pointer', border: 'none',
              boxShadow: '0 4px 16px rgba(0,80,203,0.25)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ย้อนกลับ
          </button>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--outline)', marginTop:14, fontWeight:500, opacity:0.6 }}>
          English Class Manager • กำลังพัฒนา
        </p>
      </div>
    </div>
  )
}
