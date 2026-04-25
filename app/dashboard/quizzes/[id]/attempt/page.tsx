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

  // เช็ค submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('id')
    .eq('quiz_id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (submission) redirect(`/dashboard/quizzes/${id}/result`)

  // ✅ Gate: blocked → กลับหน้า quizzes ทันที
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('status, leave_count')
    .eq('quiz_id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  const isBlocked =
    session?.status === 'blocked' ||
    (session?.leave_count ?? 0) >= 3

  if (isBlocked) redirect('/dashboard/quizzes')

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