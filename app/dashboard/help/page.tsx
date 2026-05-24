import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HelpClient from '@/components/help/HelpClient'
import { ROLES } from '@/constants/roles'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? ROLES.STUDENT) as typeof ROLES[keyof typeof ROLES]

  return <HelpClient role={role} />
}