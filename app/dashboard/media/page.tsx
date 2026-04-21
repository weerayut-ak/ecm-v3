import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import MediaClient from '@/components/media/MediaClient'

export default async function MediaPage() {
  const supabase = await createClient()
  const profile = await getProfile()
  const [{ data: knowledge }, { data: videos }] = await Promise.all([
    supabase.from('media_items').select('*').eq('type', 'knowledge').order('sort_order'),
    supabase.from('media_items').select('*').in('type', ['video', 'pdf', 'drive']).order('sort_order'),
  ])
  return <MediaClient knowledge={knowledge ?? []} videos={videos ?? []} isAdmin={profile?.role === 'admin'} />
}