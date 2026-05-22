import { createClient } from '@/lib/supabase/server'
import AdminPreviewClient from '@/components/admin/AdminPreviewClient'

export default async function PreviewPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order')

  return <AdminPreviewClient quiz={quiz} questions={questions ?? []} />
}
