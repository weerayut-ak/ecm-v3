import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import AnnouncementsClient from '@/components/announcements/AnnouncementsClient'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const profile = await getProfile()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, author:profiles(full_name, nickname)')
    .order('is_important', { ascending: false })
    .order('created_at', { ascending: false })
  return <AnnouncementsClient announcements={announcements ?? []} isAdmin={profile?.role === 'admin'} />
}
