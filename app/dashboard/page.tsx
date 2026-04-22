import Link from 'next/link'
import { BookOpen, Megaphone, ClipboardList, ArrowRight, Users, Play, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  let profile = null
  let stats = { students: 0, quizzes: 0, announcements: 0, media: 0 }
  let recentAnnouncements: {id:string;title:string;is_important:boolean;created_at:string;type:string}[] = []
  let openQuizzes: {id:string;title:string;pass_score:number;time_limit:number|null}[] = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      profile = p
      const [a,b,c,d,e,f] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','student'),
        supabase.from('quizzes').select('*',{count:'exact',head:true}),
        supabase.from('announcements').select('*',{count:'exact',head:true}),
        supabase.from('media_items').select('*',{count:'exact',head:true}),
        supabase.from('announcements').select('id,title,is_important,created_at,type').order('created_at',{ascending:false}).limit(4),
        supabase.from('quizzes').select('id,title,pass_score,time_limit').eq('is_open',true).limit(3),
      ])
      stats = { students:a.count??0, quizzes:b.count??0, announcements:c.count??0, media:d.count??0 }
      recentAnnouncements = e.data ?? []
      openQuizzes = f.data ?? []
    }
  } catch {}

  return (
    <DashboardClient
      profile={profile}
      stats={stats}
      recentAnnouncements={recentAnnouncements}
      openQuizzes={openQuizzes}
    />
  )
}
