import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import QuizAttemptClient from '@/components/quiz/QuizAttemptClient'

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()

  if (!quiz) notFound()
  if (!quiz.is_open) redirect('/dashboard/quizzes')

  // If already submitted, go to result
  const { data: submission } = await supabase
    .from('submissions')
    .select('id')
    .eq('quiz_id', id)
    .eq('student_id', user.id)
    .single()

  if (submission) redirect(`/dashboard/quizzes/${id}/result`)

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', id)
    .order('sort_order', { ascending: true })

  return (
    <QuizAttemptClient
      quiz={quiz}
      questions={questions ?? []}
      userId={user.id}
    />
  )
}
