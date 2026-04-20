import { createClient } from '@/lib/supabase/server'
import AdminExportClient from '@/components/admin/AdminExportClient'

export default async function AdminExportPage() {
  const supabase = await createClient()
  const [{ data: quizzes }, { data: submissions }] = await Promise.all([
    supabase.from('quizzes').select('id, title').order('created_at', { ascending: false }),
    supabase.from('submissions').select(`
      id, quiz_id, score, is_passed, submitted_at, time_taken,
      student:profiles(full_name, student_id, grade, nickname),
      quiz:quizzes(title)
    `).order('submitted_at', { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminExportClient quizzes={quizzes ?? []} submissions={(submissions ?? []) as any[]} />
}
