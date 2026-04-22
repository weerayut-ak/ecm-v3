'use client'
import Link from 'next/link'
import { BookOpen, Megaphone, ClipboardList, ArrowRight, Users, Play, Zap } from 'lucide-react'

interface Props {
  profile: any
  stats: { students: number; quizzes: number; announcements: number; media: number }
  recentAnnouncements: { id:string; title:string; is_important:boolean; created_at:string; type:string }[]
  openQuizzes: { id:string; title:string; pass_score:number; time_limit:number|null }[]
}

const STAT_CARDS = (stats: Props['stats']) => [
  { href:'/dashboard/students',      icon:Users,        label:'นักเรียน',   value:stats.students,      unit:'คน',     bg:'rgba(0,80,203,0.07)',  color:'var(--primary)',   glow:'rgba(0,80,203,0.2)' },
  { href:'/dashboard/media',         icon:BookOpen,     label:'สื่อการสอน', value:stats.media,         unit:'รายการ', bg:'rgba(0,104,119,0.07)', color:'var(--secondary)', glow:'rgba(0,104,119,0.2)' },
  { href:'/dashboard/announcements', icon:Megaphone,    label:'ประกาศ',     value:stats.announcements, unit:'รายการ', bg:'rgba(124,82,0,0.07)',  color:'#7c5200',          glow:'rgba(124,82,0,0.15)' },
  { href:'/dashboard/quizzes',       icon:ClipboardList,label:'แบบทดสอบ',  value:stats.quizzes,       unit:'ชุด',    bg:'rgba(67,69,209,0.07)', color:'var(--tertiary)',  glow:'rgba(67,69,209,0.2)' },
]

function HoverCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{ transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', cursor: 'pointer', ...style }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 24px 60px rgba(20,27,43,0.12)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'var(--shadow)'
      }}
    >
      {children}
    </div>
  )
}

function QuickCard({ href, icon: Icon, iconBg, iconColor, title, subtitle }: {
  href: string; icon: any; iconBg: string; iconColor: string; title: string; subtitle: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', flex: 1 }}>
      <div
        style={{
          background: 'var(--surface-lowest)', borderRadius: 'var(--r-2xl)',
          padding: '24px 20px', boxShadow: 'var(--shadow)', height: '100%',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.25s ease', cursor: 'pointer',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'var(--shadow)'; }}
      >
        <div style={{ width:44, height:44, borderRadius:14, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <Icon size={20} color={iconColor} />
        </div>
        <h4 style={{ fontWeight:800, fontSize:16, color:'var(--on-surface)', marginBottom:4 }}>{title}</h4>
        <p style={{ fontSize:13, color:'var(--on-surface-variant)', fontWeight:500 }}>{subtitle}</p>
      </div>
    </Link>
  )
}

export default function DashboardClient({ profile, stats, recentAnnouncements, openQuizzes }: Props) {
  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'คุณ'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Welcome ── */}
      <div className="fade-up" style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
          Student Dashboard
        </p>
        <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--on-surface)', lineHeight: 1.1 }}>
          Welcome back,<br />
          <span className="text-gradient">{name}</span> 👋
        </h2>
      </div>

      {/* ── Stat Cards (Admin only) ── */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }} className="stagger">
          {STAT_CARDS(stats).map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }} className="fade-up">
              <HoverCard style={{
                background: 'var(--surface-lowest)',
                borderRadius: 'var(--r-2xl)',
                padding: '24px 20px',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ width:40, height:40, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 4, fontWeight: 600 }}>{s.unit}</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:12, fontSize:13, fontWeight:700, color:s.color }}>
                  {s.label} <ArrowRight size={12} />
                </div>
              </HoverCard>
            </Link>
          ))}
        </div>
      )}

      {/* ── Bento Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 20 }}>

        {/* Hero — 8 cols */}
        <Link href="/dashboard/media" style={{ gridColumn:'span 8', textDecoration:'none' }} className="fade-up">
          <div
            style={{
              background: 'linear-gradient(135deg, #0050cb 0%, #0066ff 100%)',
              borderRadius: 'var(--r-2xl)', padding: '32px 36px',
              boxShadow: 'var(--shadow-primary-lg)',
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: 220, color: 'white', cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 30px 70px rgba(0,80,203,0.4)'; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-primary-lg)'; el.style.transform = 'translateY(0)'; }}
          >
            <div style={{ position:'absolute', right:-60, bottom:-60, width:220, height:220, background:'rgba(255,255,255,0.1)', borderRadius:'50%', filter:'blur(40px)', pointerEvents:'none' }} />
            <div>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', padding:'6px 14px', borderRadius:99, fontSize:12, fontWeight:700, marginBottom:20 }}>
                <Play size={14} fill="white" /> สื่อการเรียน
              </span>
              <h3 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.2, marginBottom:8 }}>เริ่มเรียนรู้วันนี้</h3>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:14, fontWeight:500 }}>สื่อการสอน วิดีโอ และเนื้อหาสรุปครบครัน</p>
            </div>
            <div style={{ marginTop:28 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, marginBottom:8, color:'rgba(255,255,255,0.85)' }}>
                <span>ความก้าวหน้า</span><span>75%</span>
              </div>
              <div style={{ width:'100%', height:8, background:'rgba(255,255,255,0.25)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:'75%', height:'100%', background:'var(--secondary-container)', borderRadius:99 }} />
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions — 4 cols */}
        <div style={{ gridColumn:'span 4', display:'flex', flexDirection:'column', gap:16 }}>
          <QuickCard
            href="/dashboard/announcements"
            icon={Megaphone}
            iconBg="rgba(67,69,209,0.1)"
            iconColor="var(--tertiary)"
            title="ประกาศ"
            subtitle={recentAnnouncements.length > 0 ? `${recentAnnouncements.length} รายการล่าสุด` : 'ยังไม่มีประกาศ'}
          />
          <QuickCard
            href="/dashboard/quizzes"
            icon={Zap}
            iconBg="rgba(0,104,119,0.1)"
            iconColor="var(--secondary)"
            title="แบบทดสอบ"
            subtitle={openQuizzes.length > 0 ? `${openQuizzes.length} ชุดที่เปิดอยู่` : 'ยังไม่มีแบบทดสอบ'}
          />
        </div>

        {/* Announcements list — 6 cols */}
        <div style={{ gridColumn:'span 6', background:'var(--surface-lowest)', borderRadius:'var(--r-2xl)', padding:24, boxShadow:'var(--shadow)' }} className="fade-up">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'rgba(0,80,203,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Megaphone size={16} color="var(--primary)" />
              </div>
              <span style={{ fontWeight:800, fontSize:16 }}>ประกาศล่าสุด</span>
            </div>
            <Link href="/dashboard/announcements" style={{ fontSize:13, color:'var(--primary)', textDecoration:'none', fontWeight:700 }}>ดูทั้งหมด →</Link>
          </div>
          {recentAnnouncements.length === 0
            ? <p style={{ color:'var(--outline)', fontSize:13, textAlign:'center', padding:'20px 0' }}>ยังไม่มีประกาศ</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {recentAnnouncements.map(a => (
                  <Link key={a.id} href="/dashboard/announcements" className="hover-row"
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:'var(--r-lg)', textDecoration:'none', transition:'background 0.15s' }}>
                    <span style={{ fontSize:20 }}>{a.type==='scores'?'📊':a.type==='image'?'🖼️':'📢'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--on-surface)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                      <p style={{ fontSize:11, color:'var(--outline)', marginTop:2 }}>{new Date(a.created_at).toLocaleDateString('th-TH')}</p>
                    </div>
                    {a.is_important && <span className="badge badge-blue">สำคัญ</span>}
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Open Quizzes list — 6 cols */}
        <div style={{ gridColumn:'span 6', background:'var(--surface-lowest)', borderRadius:'var(--r-2xl)', padding:24, boxShadow:'var(--shadow)' }} className="fade-up">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'rgba(67,69,209,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ClipboardList size={16} color="var(--tertiary)" />
              </div>
              <span style={{ fontWeight:800, fontSize:16 }}>แบบทดสอบที่เปิด</span>
            </div>
            <Link href="/dashboard/quizzes" style={{ fontSize:13, color:'var(--primary)', textDecoration:'none', fontWeight:700 }}>ดูทั้งหมด →</Link>
          </div>
          {openQuizzes.length === 0
            ? <p style={{ color:'var(--outline)', fontSize:13, textAlign:'center', padding:'20px 0' }}>ยังไม่มีแบบทดสอบที่เปิด</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {openQuizzes.map(q => (
                  <Link key={q.id} href={`/dashboard/quizzes/${q.id}/terms`} className="hover-card"
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderRadius:'var(--r-xl)', background:'var(--surface-low)', textDecoration:'none', transition:'all 0.18s', cursor:'pointer' }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--on-surface)' }}>{q.title}</p>
                      <p style={{ fontSize:11, color:'var(--outline)', marginTop:3 }}>
                        ผ่าน {q.pass_score}% {q.time_limit ? `· ${q.time_limit} นาที` : '· ไม่จำกัดเวลา'}
                      </p>
                    </div>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#0050cb,#0066ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(0,80,203,0.25)' }}>
                      <ArrowRight size={14} color="white" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

      </div>
    </div>
  )
}
