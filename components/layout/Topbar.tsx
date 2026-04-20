'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, ChevronRight } from 'lucide-react'

interface Profile { full_name: string; nickname?: string | null; role: string }

const TITLES: [string, string][] = [
  ['/dashboard/admin',         'Admin Panel'],
  ['/dashboard/students',      'รายชื่อนักเรียน'],
  ['/dashboard/media',         'สื่อการสอน'],
  ['/dashboard/announcements', 'ประกาศข่าวสาร'],
  ['/dashboard/quizzes',       'แบบทดสอบ'],
  ['/dashboard/profile',       'โปรไฟล์ของฉัน'],
  ['/dashboard',               'Dashboard'],
]

export default function Topbar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const title = TITLES.find(([k]) => pathname.startsWith(k))?.[1] ?? 'English Class'
  const initial = (profile?.nickname ?? profile?.full_name ?? 'G')[0]?.toUpperCase() ?? 'G'

  return (
    <header style={{
      height: 54, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }} className="hidden sm:block">ภาคเรียน 1/2568</span>
        <button className="btn btn-icon btn-ghost" style={{ position: 'relative' }}>
          <Bell size={17} />
        </button>
        <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {initial}
          </div>
        </Link>
      </div>
    </header>
  )
}
