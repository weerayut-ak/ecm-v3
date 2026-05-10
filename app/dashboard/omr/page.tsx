import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import OMRAdminDashboard from '@/components/omr/OMRAdminDashboard'

export default async function OMRPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  return <OMRAdminDashboard />
}