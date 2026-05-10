import { createClient } from '@/lib/supabase/server'
import AdminQuizzesClient from '@/components/admin/AdminQuizzesClient'

export default async function AdminQuizzesPage() {
  const supabase = await createClient()

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .order('created_at', { ascending: false })

  return <AdminQuizzesClient quizzes={quizzes ?? []} />
}