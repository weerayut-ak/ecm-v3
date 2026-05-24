import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  let profile = null
  let stats = { students: 0, quizzes: 0, announcements: 0, media: 0 }
  let recentAnnouncements: any[] = []
  let openQuizzes: any[] = []
  let pinnedLessons: any[] = []
  let myStats: any
  let quizPassStats: any[] = []
  let appointments: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      profile = p
      const isAdmin = p?.role === 'admin'

      const [a,b,c,d,e,f,pinnedData,submissionsData,quizzesForStats,appointmentsData] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','student'),
        supabase.from('quizzes').select('*',{count:'exact',head:true}),
        supabase.from('announcements').select('*',{count:'exact',head:true}),
        supabase.from('media_items').select('*',{count:'exact',head:true}),
        supabase.from('announcements').select('id,title,is_important,created_at,type,content').order('created_at',{ascending:false}).limit(4),
        supabase.from('quizzes').select('id,title,pass_score,time_limit,description').eq('is_open',true).limit(3),
        supabase.from('media_items').select('*').eq('is_pinned',true).limit(3),
        isAdmin
          ? supabase.from('submissions').select('quiz_id,is_passed,quiz:quizzes(id,title)')
          : supabase.from('submissions').select('score,is_passed').eq('student_id',user.id),
        supabase.from('quizzes').select('id').eq('is_open',true),
        supabase.from('appointments').select('id,title,date,time,description,location').order('date',{ascending:true}),
      ])

      stats = { students:a.count??0, quizzes:b.count??0, announcements:c.count??0, media:d.count??0 }
      recentAnnouncements = e.data ?? []
      openQuizzes = f.data ?? []
      pinnedLessons = pinnedData.data ?? []
      appointments = appointmentsData.data ?? []

      if (isAdmin) {
        const subs = (submissionsData.data ?? []) as any[]
        const map = new Map<string,any>()
        for (const s of subs) {
          const qid = s.quiz_id; const title = s.quiz?.title ?? 'ไม่ระบุชื่อ'
          if (!map.has(qid)) map.set(qid,{title,passed:0,failed:0,total:0})
          const entry = map.get(qid)!; entry.total++
          if (s.is_passed) entry.passed++; else entry.failed++
        }
        quizPassStats = Array.from(map.entries()).map(([quizId,v])=>({quizId,...v}))
      } else {
        const subs = (submissionsData.data ?? []) as any[]
        const openIds = (quizzesForStats.data ?? []).map((q:any)=>q.id)
        const scored = subs.filter(s=>s.score!==null)
        const avg = scored.length ? scored.reduce((a,s)=>a+(s.score??0),0)/scored.length : 0
        const passed = subs.filter(s=>s.is_passed).length
        myStats = { totalSubmissions:subs.length, avgScore:avg, passedCount:passed, pendingCount:Math.max(0,openIds.length-subs.length) }
      }
    }
  } catch (error) {
    console.error('Error loading dashboard:', error)
  }

  return (
    <DashboardClient
      profile={profile}
      stats={stats}
      recentAnnouncements={recentAnnouncements}
      openQuizzes={openQuizzes}
      pinnedLessons={pinnedLessons}
      myStats={myStats}
      quizPassStats={quizPassStats}
      appointments={appointments}
    />
  )
}
