'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Megaphone, ClipboardList, Settings, LogOut, BarChart2, User, MessageCircle, ScanLine } from 'lucide-react'

interface Profile { id: string; full_name: string; nickname?: string | null; role: string; grade?: string | null }

const NAV = [
  { href: '/dashboard',               label: 'หน้าหลัก',    icon: LayoutDashboard },
  { href: '/dashboard/media',         label: 'สื่อการเรียน', icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ',       icon: Megaphone },
  { href: '/dashboard/quizzes',       label: 'ควิซ',         icon: ClipboardList },
  { href: '/dashboard/profile',       label: 'โปรไฟล์',     icon: User },
]

const ADMIN_NAV = [
  { href: '/dashboard/students',          label: 'นักเรียน',     icon: Users },
  { href: '/dashboard/admin',             label: 'Admin Panel',  icon: Settings },
  { href: '/dashboard/admin/submissions', label: 'ประวัติสอบ',   icon: BarChart2 },
  { href: '/dashboard/omr',              label: 'OMR สแกน',     icon: ScanLine },  // ← แก้แล้ว
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const isAdmin  = profile?.role === 'admin'
  const name     = profile?.nickname ?? profile?.full_name ?? 'Guest'

  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside style={{
      width: 'var(--sidebar-w, 288px)',
      background: 'rgba(241,243,255,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: 'none',
      boxShadow: '40px 0 80px rgba(20,27,43,0.03)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, height: '100%',
      padding: '24px 16px',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', marginBottom: 32 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, #0050cb 0%, #0066ff 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 8px 20px rgba(0,80,203,0.25)',
        }}>
          <BookOpen size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: '#0050cb', letterSpacing: '-0.03em', lineHeight: 1.1 }}>The Scholar</div>
          <div style={{ fontSize: 11, color: 'var(--outline)', fontWeight: 600, marginTop: 1 }}>V3 Desktop</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>เมนูหลัก</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${isActive(href) ? 'active' : ''}`}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span>{label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="section-label" style={{ marginTop: 20, marginBottom: 8 }}>จัดการ</div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${isActive(href) ? 'active' : ''}`}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* CTA + Logout */}
      <div style={{ marginTop: 16 }}>
        <a href="https://www.facebook.com/love.esthers" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
          <button style={{
            width: '100%', padding: '14px 20px', borderRadius: 'var(--r-full)',
            background: 'linear-gradient(135deg, #0050cb 0%, #0066ff 100%)',
            color: 'white', fontWeight: 700, fontSize: 14,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,80,203,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s ease', fontFamily: 'var(--font)',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,80,203,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,80,203,0.2)')}
          >
            <MessageCircle size={16} /> ติดต่อผู้สอน
          </button>
        </a>

        <button onClick={logout} className="nav-item btn-ghost"
          style={{ width: '100%', marginTop: 8, fontSize: 13, color: 'var(--outline)', justifyContent: 'center' }}>
          <LogOut size={15} /><span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}