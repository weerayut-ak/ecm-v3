import { createClient } from '@/lib/supabase/server'
import MediaClient from '@/components/media/MediaClient'

export default async function AdminMediaPage() {
  const supabase = await createClient()
  const [{ data: knowledge }, { data: videos }] = await Promise.all([
    supabase.from('media_items').select('*').eq('type', 'knowledge').order('sort_order'),
    supabase.from('media_items').select('*').in('type', ['video', 'pdf', 'drive']).order('sort_order'),
  ])
  return (
    <div>
      <h1 className="text-lg font-semibold mb-5">จัดการสื่อการสอน</h1>
      <MediaClient knowledge={knowledge ?? []} videos={videos ?? []} isAdmin={true} />
    </div>
  )
}