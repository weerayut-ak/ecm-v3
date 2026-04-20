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
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸—à¸³à¹à¸šà¸šà¸—à¸”à¸ªà¸­à¸š</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          à¸”à¸¹à¹à¸¥à¸°à¸ˆà¸±à¸”à¸à¸²à¸£à¸œà¸¥à¸à¸²à¸£à¸ªà¸­à¸šà¸‚à¸­à¸‡à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™à¸—à¸¸à¸à¸„à¸™
        </p>
      </div>
      <AdminSubmissionsClient
        submissions={(submissions ?? []) as any[]}
        quizzes={quizzes ?? []}
      />
    </div>
  )
}
