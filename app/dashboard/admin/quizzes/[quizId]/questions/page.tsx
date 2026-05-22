import { createClient } from "@/lib/supabase/server"
import AdminQuestionsClient from "@/components/admin/AdminQuestionsClient"

export default async function QuestionsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single()

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("sort_order")

  return (
    <AdminQuestionsClient
      quizId={quizId}
      quizTitle={quiz?.title ?? ""}
      initialQuestions={questions ?? []}
    />
  )
}
