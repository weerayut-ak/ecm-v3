'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Megaphone, ClipboardList, User } from 'lucide-react'

interface Profile { role: string }

const TABS = [
  { href: '/dashboard',               label: 'หลัก',    icon: LayoutDashboard },
  { href: '/dashboard/media',         label: 'สื่อ',    icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ',  icon: Megaphone },
  { href: '/dashboard/quizzes',       label: 'ข้อสอบ',  icon: ClipboardList },
  { href: '/dashboard/profile',       label: 'โปรไฟล์', icon: User },
]

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="mobile-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '6px 4px calc(6px + env(safe-area-inset-bottom))', justifyContent: 'space-around',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
    }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
            color: active ? 'var(--blue)' : 'var(--text-3)',
            background: active ? 'var(--blue-light)' : 'transparent',
            transition: 'all 0.15s', minWidth: 56,
          }}>
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
