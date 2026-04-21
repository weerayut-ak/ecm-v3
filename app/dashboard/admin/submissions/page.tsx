import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSubmissionsClient from '@/components/admin/AdminSubmissionsClient'

export default async function AdminSubmissionsPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: submissions }, { data: quizzes }] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        id, quiz_id, student_id, score, is_passed,
        submitted_at, time_taken, answers,
        student:profiles(id, full_name, nickname, grade, student_id),
        quiz:quizzes(id, title, pass_score)
      `)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('quizzes')
      .select('id, title, pass_score')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>ประวัติการทำแบบทดสอบ</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          ดูและจัดการผลการสอบของนักเรียนทุกคน
        </p>
      </div>
      <AdminSubmissionsClient
        submissions={(submissions ?? []) as any[]}
        quizzes={quizzes ?? []}
      />
    </div>
  )
}
