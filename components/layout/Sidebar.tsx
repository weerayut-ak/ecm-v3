'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Megaphone, ClipboardList, Settings, LogOut, User, BarChart2 } from 'lucide-react'

interface Profile { id: string; full_name: string; nickname?: string | null; role: string; grade?: string | null }

const NAV = [
  { href: '/dashboard',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/media',         label: 'สื่อการสอน',    icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ',         icon: Megaphone },
  { href: '/dashboard/quizzes',       label: 'แบบทดสอบ',      icon: ClipboardList },
]
const ADMIN_NAV = [
  { href: '/dashboard/students',      label: 'นักเรียน',      icon: Users },
  { href: '/dashboard/admin',         label: 'Admin Panel',   icon: Settings },
  { href: '/dashboard/admin/submissions', label: 'ประวัติสอบ', icon: BarChart2 },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'Guest'
  const initial = name[0]?.toUpperCase() ?? 'G'

  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside style={{ width: 'var(--sidebar-w,220px)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={16} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>English Class</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>ม.1–3</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="section-label" style={{ marginTop: 8, marginBottom: 6 }}>เมนูหลัก</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${isActive(href) ? 'active' : ''}`}>
            <Icon size={16} /><span>{label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="section-label" style={{ marginTop: 16, marginBottom: 6 }}>จัดการ</div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${isActive(href) ? 'active' : ''}`}>
                <Icon size={16} /><span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard/profile" className={`nav-item ${isActive('/dashboard/profile') ? 'active' : ''}`} style={{ marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isAdmin ? 'Admin' : profile?.grade ?? 'นักเรียน'}</div>
          </div>
        </Link>
        <button onClick={logout} className="nav-item btn-ghost" style={{ width: '100%', fontSize: 12, color: 'var(--text-3)' }}>
          <LogOut size={14} /><span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}