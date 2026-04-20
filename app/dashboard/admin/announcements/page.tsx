import { createClient } from '@/lib/supabase/server'
import AnnouncementsClient from '@/components/announcements/AnnouncementsClient'

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, author:profiles(full_name, nickname)')
    .order('is_important', { ascending: false })
    .order('created_at', { ascending: false })
  return (
    <div>
      <h1 className="text-lg font-semibold mb-5">จัดการประกาศ</h1>
      <AnnouncementsClient announcements={announcements ?? []} isAdmin={true} />
    </div>
  )
}
