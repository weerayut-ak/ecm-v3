'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Settings, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLogo from '@/components/ui/AppLogo'

interface Profile { full_name: string; nickname?: string | null; role: string }

export default function Topbar({ profile, onMenuClick }: { profile: Profile | null; onMenuClick?: () => void }) {
  const router  = useRouter()
  const initial = (profile?.nickname ?? profile?.full_name ?? 'G')[0]?.toUpperCase() ?? 'G'
  const isAdmin = profile?.role === 'admin'

  const [semester, setSemester] = useState('1/2568')
  const [editing, setEditing]   = useState(false)
  const [editVal, setEditVal]   = useState('1/2568')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'semester').single().then(({ data }) => {
      if (data?.value) { setSemester(data.value); setEditVal(data.value) }
    })
  }, [])

  async function saveSemester() {
    await supabase.from('app_settings').upsert({ key: 'semester', value: editVal }, { onConflict: 'key' })
    setSemester(editVal)
    setEditing(false)
  }

  return (
    <header style={{
      height: 56,
      background: 'rgba(249,249,255,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: 'none',
      boxShadow: '0 4px 20px rgba(20,27,43,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
    }}>
      <style>{`
        .tb-hamburger { display: none; }
        .tb-bell, .tb-settings { display: flex; }
        .tb-semester { display: none; }
        @media (min-width: 769px) {
          .tb-hamburger { display: flex; }
          .tb-semester  { display: inline; }
        }
        @media (max-width: 480px) {
          .tb-bell, .tb-settings { display: none; }
        }
      `}</style>

      {/* ── ฝั่งซ้าย ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <button
          className="tb-hamburger"
          onClick={onMenuClick}
          title="เปิด/ปิดเมนู"
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
            background: 'transparent', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--outline)', transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,80,203,0.09)'; e.currentTarget.style.color = '#0050cb' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--outline)' }}
        >
          <Menu size={20} />
        </button>
        <AppLogo showName size={30} style={{ minWidth: 0 }} />
      </div>

      {/* ── ฝั่งขวา ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* ภาคเรียน */}
        {editing && isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--outline)', fontWeight: 600 }}>ภาคเรียน</span>
            <input
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveSemester(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              style={{ fontSize: 12, fontWeight: 700, color: '#0050cb', border: '1.5px solid #0050cb', borderRadius: 8, padding: '3px 8px', width: 72, background: 'white', fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={saveSemester} style={{ fontSize: 11, background: '#0050cb', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>บันทึก</button>
            <button onClick={() => setEditing(false)} style={{ fontSize: 11, background: 'rgba(0,0,0,0.06)', color: 'var(--text-2)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>ยกเลิก</button>
          </div>
        ) : (
          <span
            className="tb-semester"
            onClick={() => isAdmin && setEditing(true)}
            title={isAdmin ? 'คลิกเพื่อแก้ไขภาคเรียน' : undefined}
            style={{ fontSize: 12, color: 'var(--outline)', fontWeight: 600, cursor: isAdmin ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s', userSelect: 'none' }}
            onMouseEnter={e => isAdmin && (e.currentTarget.style.background = 'rgba(0,80,203,0.07)')}
            onMouseLeave={e => isAdmin && (e.currentTarget.style.background = 'transparent')}
          >
            ภาคเรียน {semester}
            {isAdmin && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }}>✏️</span>}
          </span>
        )}

        {/* 🔔 กระดิ่ง → under-construction */}
        <button
          className="tb-bell"
          onClick={() => router.push('/under-construction')}
          title="การแจ้งเตือน"
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--outline)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,80,203,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell size={18} />
        </button>

        {/* ⚙️ ตั้งค่า → under-construction */}
        <button
          className="tb-settings"
          onClick={() => router.push('/under-construction')}
          title="ตั้งค่า"
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--outline)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,80,203,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Settings size={18} />
        </button>

        {/* Avatar → ไปหน้า Profile */}
        <Link href="https://www.facebook.com/love.esthers" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', // เพิ่มเพื่อตัดขอบรูปให้เป็นวงกลม
            boxShadow: '0 4px 12px rgba(0,80,203,0.25)',
            border: '2px solid rgba(255,255,255,0.8)',
            // ลบ background แบบ gradient ออก (หากโลโก้คุณโปร่งใสและยังอยากได้พื้นหลังสีน้ำเงิน สามารถใส่กลับมาได้ครับ)
          }}>
            <img 
              src="/facebook.png" 
              alt="Facebook" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        </Link>

      </div>
    </header>
  )
}