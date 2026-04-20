import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/students/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: submissions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('submissions')
      .select('*, quiz:quizzes(title, pass_score)')
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false }),
  ])

  return <ProfileClient profile={profile} submissions={submissions ?? []} userId={user.id} />
}
