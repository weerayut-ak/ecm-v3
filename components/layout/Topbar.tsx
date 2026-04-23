'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile { full_name: string; nickname?: string | null; role: string }

export default function Topbar({ profile, onMenuClick }: { profile: Profile | null; onMenuClick?: () => void }) {
  const initial = (profile?.nickname ?? profile?.full_name ?? 'G')[0]?.toUpperCase() ?? 'G'
  const isAdmin = profile?.role === 'admin'

  const [semester, setSemester] = useState('1/2568')
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('1/2568')
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
        .tb-title { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
        .tb-bell, .tb-settings { display: flex; }
        @media (max-width: 480px) {
          .tb-bell, .tb-settings { display: none; }
          .tb-title { max-width: 140px; font-size: 15px; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        {/* Hamburger button */}
        {/* Hamburger button */}
        <button
          onClick={onMenuClick}
          title="เปิด/ปิดเมนู"
          className="hidden sm:flex" // 1. เพิ่ม className ตรงนี้ (ซ่อนในมือถือ, แสดงเป็น flex ในจอใหญ่)
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
            background: 'transparent', cursor: 'pointer',
            // display: 'flex',      // 2. ลบบรรทัดนี้ออก หรือคอมเมนต์ไว้
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--outline)', transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,80,203,0.09)'; e.currentTarget.style.color = '#0050cb' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--outline)' }}
        >
          <Menu size={20} />
        </button>

        <span className="tb-title" style={{ fontWeight: 900, color: '#0050cb', letterSpacing: '-0.03em' }}>
          English Class
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Semester display / edit */}
        {editing && isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--outline)', fontWeight: 600 }}>ภาคเรียน</span>
            <input
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveSemester(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              style={{
                fontSize: 12, fontWeight: 700, color: '#0050cb',
                border: '1.5px solid #0050cb', borderRadius: 8,
                padding: '3px 8px', width: 72, background: 'white',
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={saveSemester} style={{ fontSize: 11, background: '#0050cb', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>บันทึก</button>
            <button onClick={() => setEditing(false)} style={{ fontSize: 11, background: 'rgba(0,0,0,0.06)', color: 'var(--text-2)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>ยกเลิก</button>
          </div>
        ) : (
          <span
            onClick={() => isAdmin && setEditing(true)}
            className="hidden sm:block"
            title={isAdmin ? 'คลิกเพื่อแก้ไขภาคเรียน' : undefined}
            style={{
              fontSize: 12, color: 'var(--outline)', fontWeight: 600,
              cursor: isAdmin ? 'pointer' : 'default',
              padding: '4px 8px', borderRadius: 8,
              transition: 'background 0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={e => isAdmin && (e.currentTarget.style.background = 'rgba(0,80,203,0.07)')}
            onMouseLeave={e => isAdmin && (e.currentTarget.style.background = 'transparent')}
          >
            ภาคเรียน {semester}{isAdmin && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }}>✏️</span>}
          </span>
        )}

        <button className="tb-bell" style={{
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

        <button className="tb-settings" style={{
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

        <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0050cb, #0066ff)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,80,203,0.25)',
            border: '2px solid rgba(255,255,255,0.8)',
          }}>
            {initial}
          </div>
        </Link>
      </div>
    </header>
  )
}