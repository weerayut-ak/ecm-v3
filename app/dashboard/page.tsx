import Link from 'next/link'
import { BookOpen, Megaphone, ClipboardList, ArrowRight, TrendingUp, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  let profile = null, stats = { students: 0, quizzes: 0, announcements: 0, media: 0 }
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
      stats = { students: a.count??0, quizzes: b.count??0, announcements: c.count??0, media: d.count??0 }
      recentAnnouncements = e.data ?? []
      openQuizzes = f.data ?? []
    }
  } catch {}

  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'คุณ'

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome banner */}
      <div style={{ background: 'var(--blue)', borderRadius: 'var(--r-xl)', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>ยินดีต้อนรับ</p>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{name} 👋</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>ภาคเรียนที่ 1/2568 · {isAdmin ? 'Admin' : profile?.grade ?? 'นักเรียน'}</p>
        </div>
        <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={28} color="white" />
        </div>
      </div>

      {/* Stats - admin only */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }} className="stagger">
          {[
            { href:'/dashboard/students', icon: Users, label:'นักเรียน', value: stats.students, unit:'คน', color:'#EFF6FF', tc:'var(--blue)' },
            { href:'/dashboard/media', icon: BookOpen, label:'สื่อการสอน', value: stats.media, unit:'รายการ', color:'#F0FDF4', tc:'var(--green)' },
            { href:'/dashboard/announcements', icon: Megaphone, label:'ประกาศ', value: stats.announcements, unit:'รายการ', color:'#FFFBEB', tc:'var(--amber)' },
            { href:'/dashboard/quizzes', icon: ClipboardList, label:'แบบทดสอบ', value: stats.quizzes, unit:'ชุด', color:'#F5F3FF', tc:'var(--purple)' },
          ].map(s => (
            <Link key={s.href} href={s.href} className="card-hover fade-up" style={{ textDecoration:'none', display:'block' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:s.color, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <s.icon size={18} color={s.tc} />
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{s.unit}</div>
              <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:8, fontSize:12, fontWeight:600, color:s.tc }}>
                {s.label}<ArrowRight size={11} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 2-col bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Announcements */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontWeight:700 }}>ประกาศล่าสุด</span>
            <Link href="/dashboard/announcements" style={{ fontSize:12, color:'var(--blue)', textDecoration:'none', fontWeight:500 }}>ดูทั้งหมด →</Link>
          </div>
          {recentAnnouncements.length === 0 ? <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:'16px 0' }}>ยังไม่มีประกาศ</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentAnnouncements.map(a => (
                <Link key={a.id} href="/dashboard/announcements" style={{ display:'flex', alignItems:'flex-start', gap:10, textDecoration:'none', padding:'8px', borderRadius:'var(--r-md)', transition:'background 0.15s' }}
                  className="hover-row">
                  <span style={{ fontSize:18 }}>{a.type==='scores'?'📊':a.type==='image'?'🖼️':'📢'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(a.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  {a.is_important && <span className="badge badge-blue">สำคัญ</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open quizzes */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontWeight:700 }}>แบบทดสอบที่เปิด</span>
            <Link href="/dashboard/quizzes" style={{ fontSize:12, color:'var(--blue)', textDecoration:'none', fontWeight:500 }}>ดูทั้งหมด →</Link>
          </div>
          {openQuizzes.length === 0 ? <p style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:'16px 0' }}>ยังไม่มีแบบทดสอบที่เปิด</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {openQuizzes.map(q => (
                <Link key={q.id} href={`/dashboard/quizzes/${q.id}/terms`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', textDecoration:'none', transition:'all 0.15s' }}
                  className="hover-card">
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{q.title}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>ผ่าน {q.pass_score}% {q.time_limit ? `· ${q.time_limit} นาที` : '· ไม่จำกัดเวลา'}</p>
                  </div>
                  <ArrowRight size={14} color="var(--blue)" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}