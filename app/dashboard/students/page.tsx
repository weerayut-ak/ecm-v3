import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import StudentsClient from '@/components/students/StudentsClient'

export default async function StudentsPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('grade')
    .order('full_name')

  return <StudentsClient students={students ?? []} />
}
