import { createClient } from "@/lib/supabase/server"
import AdminQuestionsClient from "@/components/admin/AdminQuestionsClient"

export default async function QuestionsPage({ params }: { params: { quizId: string } }) {
  const supabase = await createClient() // ✅ เพิ่ม await

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", params.quizId)
    .single()

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", params.quizId)
    .order("sort_order")

  return (
    <AdminQuestionsClient
      quizId={params.quizId}
      quizTitle={quiz?.title ?? ""}
      initialQuestions={questions ?? []}
    />
  )
}