import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AddQuizClient from '@/components/admin/AddQuizClient'

export default async function AddQuizPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return <AddQuizClient />
}