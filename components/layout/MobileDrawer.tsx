'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Megaphone, ClipboardList,
  Users, Settings, BarChart2, User, LogOut, X, Sparkles, MessageCircle,
} from 'lucide-react'

interface Profile { id: string; full_name: string; nickname?: string | null; role: string; grade?: string | null }

const NAV = [
  { href: '/dashboard',               label: 'หน้าหลัก',    icon: LayoutDashboard },
  { href: '/dashboard/media',         label: 'สื่อการเรียน', icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ',       icon: Megaphone },
  { href: '/dashboard/quizzes',       label: 'ควิซ',         icon: ClipboardList },
  { href: '/dashboard/profile',       label: 'โปรไฟล์',     icon: User },
]
const ADMIN_NAV = [
  { href: '/dashboard/students',          label: 'นักเรียน',   icon: Users },
  { href: '/dashboard/admin',             label: 'Admin Panel', icon: Settings },
  { href: '/dashboard/admin/submissions', label: 'ประวัติสอบ',  icon: BarChart2 },
]

interface Props {
  profile: Profile | null
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ profile, open, onClose }: Props) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'Guest'
  const initial = name[0]?.toUpperCase() ?? 'G'

  // Close on route change
  useEffect(() => { onClose() }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(20,27,43,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 300, zIndex: 999,
        background: 'rgba(241,243,255,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '20px 0 60px rgba(20,27,43,0.15)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>

        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: -60, left: -60, width: 240, height: 240,
          background: 'rgba(0,102,255,0.08)', borderRadius: '50%', filter: 'blur(50px)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px', borderBottom: '1px solid var(--outline-variant)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #0050cb, #0066ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(0,80,203,0.3)',
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#0050cb', letterSpacing: '-0.02em' }}>The Scholar</div>
              <div style={{ fontSize: 10, color: 'var(--outline)', fontWeight: 600 }}>V3 Desktop</div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: 'var(--surface-highest)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--outline)', transition: 'all 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* User chip */}
        <Link href="/dashboard/profile" onClick={onClose} style={{ textDecoration: 'none', margin: '16px 16px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 16,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--outline-variant)',
            boxShadow: '0 2px 8px rgba(20,27,43,0.05)',
            transition: 'all 0.2s',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0050cb, #0066ff)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 15, flexShrink: 0,
              boxShadow: '0 3px 10px rgba(0,80,203,0.25)',
            }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--outline)', fontWeight: 500 }}>{isAdmin ? 'Admin' : profile?.grade ?? 'นักเรียน'}</div>
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--outline)', padding: '8px 8px 6px' }}>เมนูหลัก</div>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                textDecoration: 'none',
                fontWeight: 600, fontSize: 14,
                color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                background: active ? 'rgba(0,80,203,0.1)' : 'transparent',
                border: active ? '1px solid rgba(0,80,203,0.15)' : '1px solid transparent',
                transition: 'all 0.18s',
              }}>
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                {label}
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--outline)', padding: '16px 8px 6px' }}>จัดการ</div>
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    textDecoration: 'none',
                    fontWeight: 600, fontSize: 14,
                    color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                    background: active ? 'rgba(0,80,203,0.1)' : 'transparent',
                    border: active ? '1px solid rgba(0,80,203,0.15)' : '1px solid transparent',
                    transition: 'all 0.18s',
                  }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                    {label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* Footer actions */}
        <div style={{ padding: '12px 16px 24px', borderTop: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '13px 20px', borderRadius: 99,
            background: 'linear-gradient(135deg, #0050cb 0%, #0066ff 100%)',
            color: 'white', fontWeight: 700, fontSize: 14,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0,80,203,0.25)',
            fontFamily: 'var(--font)',
          }}>
            <MessageCircle size={16} />
            ติดต่อผู้สอน
          </button>

          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 20px', borderRadius: 99,
              background: 'transparent',
              color: 'var(--error)', fontWeight: 600, fontSize: 14,
              border: '1.5px solid rgba(186,26,26,0.2)', cursor: 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--error-container)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  )
}
