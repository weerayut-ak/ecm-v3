'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Megaphone, ClipboardList, User } from 'lucide-react'

interface Profile { role: string }

const TABS = [
  { href: '/dashboard',               label: 'หลัก',    icon: LayoutDashboard },
  { href: '/dashboard/media',         label: 'สื่อ',    icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ',  icon: Megaphone },
  { href: '/dashboard/quizzes',       label: 'ควิซ',    icon: ClipboardList },
  { href: '/dashboard/profile',       label: 'โปรไฟล์', icon: User },
]

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="mobile-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'rgba(249,249,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--outline-variant)',
      padding: '6px 8px calc(6px + env(safe-area-inset-bottom))',
      justifyContent: 'space-around',
      boxShadow: '0 -10px 30px rgba(20,27,43,0.06)',
    }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: active ? '8px 20px' : '8px 14px',
            borderRadius: 99,
            textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--outline)',
            background: active ? 'linear-gradient(135deg, rgba(0,80,203,0.1), rgba(0,102,255,0.08))' : 'transparent',
            transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            transform: active ? 'translateY(-2px)' : 'none',
          }}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            {active && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em' }}>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
