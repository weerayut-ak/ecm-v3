import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, BookOpen, Megaphone, ClipboardList, Download } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: studentCount },
    { count: quizCount },
    { count: annCount },
    { count: mediaCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('quizzes').select('*', { count: 'exact', head: true }),
    supabase.from('announcements').select('*', { count: 'exact', head: true }),
    supabase.from('media_items').select('*', { count: 'exact', head: true }),
  ])

  const sections = [
    { href: '/dashboard/admin/students', icon: Users, label: 'จัดการนักเรียน', value: studentCount ?? 0, unit: 'คน', color: 'bg-blue-50 text-blue-600' },
    { href: '/dashboard/admin/media', icon: BookOpen, label: 'สื่อการสอน', value: mediaCount ?? 0, unit: 'รายการ', color: 'bg-green-50 text-green-600' },
    { href: '/dashboard/admin/announcements', icon: Megaphone, label: 'ประกาศ', value: annCount ?? 0, unit: 'ประกาศ', color: 'bg-amber-50 text-amber-600' },
    { href: '/dashboard/admin/quizzes', icon: ClipboardList, label: 'แบบทดสอบ', value: quizCount ?? 0, unit: 'ชุด', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">จัดการระบบทั้งหมด</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map(s => (
          <Link key={s.href} href={s.href} className="card hover:shadow-md transition-shadow group">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon size={20} />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.unit}</div>
            <div className="text-sm font-medium text-gray-700 mt-2 group-hover:text-primary-600 transition-colors">{s.label} →</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-gray-400" />
          <h3 className="font-semibold">นำออกข้อมูลด่วน</h3>
        </div>
        <Link href="/dashboard/admin/export" className="btn btn-primary btn-sm">
          📊 นำออกรายงานคะแนน
        </Link>
      </div>
    </div>
  )
}
