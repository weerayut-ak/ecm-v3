import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import { notFound } from 'next/navigation'
import VideoPlayerClient from '@/components/media/VideoPlayerClient'

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile()

  const [{ data: item }, { data: related }] = await Promise.all([
    supabase.from('media_items').select('*').eq('id', id).single(),
    supabase.from('media_items').select('*').neq('id', id)
      .in('type', ['video', 'pdf', 'drive']).order('sort_order').limit(6),
  ])

  if (!item) notFound()

  return (
    <VideoPlayerClient
      item={item}
      related={related ?? []}
      isAdmin={profile?.role === 'admin'}
    />
  )
}