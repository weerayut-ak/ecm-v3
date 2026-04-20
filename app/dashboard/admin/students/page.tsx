import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminStudentPreview from '@/components/admin/AdminStudentPreview'

export default async function AdminStudentsPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: students }, { data: quizzes }, { data: submissions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('grade').order('full_name'),
    supabase.from('quizzes').select('id, title').order('created_at'),
    supabase.from('submissions').select('*, student:profiles(full_name, grade, student_id, nickname)').order('submitted_at', { ascending: false }),
  ])

  return <AdminStudentPreview students={students ?? []} quizzes={quizzes ?? []} submissions={submissions ?? []} />
}
