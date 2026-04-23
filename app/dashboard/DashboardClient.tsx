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
  { href:'/dashboard/students',      icon:Users,        label:'นักเรียน',   value:stats.students,      unit:'คน',     bg:'rgba(0,80,203,0.07)',  color:'var(--primary)'   },
  { href:'/dashboard/media',         icon:BookOpen,     label:'สื่อการสอน', value:stats.media,         unit:'รายการ', bg:'rgba(0,104,119,0.07)', color:'var(--secondary)' },
  { href:'/dashboard/announcements', icon:Megaphone,    label:'ประกาศ',     value:stats.announcements, unit:'รายการ', bg:'rgba(124,82,0,0.07)',  color:'#7c5200'          },
  { href:'/dashboard/quizzes',       icon:ClipboardList,label:'แบบทดสอบ',  value:stats.quizzes,       unit:'ชุด',    bg:'rgba(67,69,209,0.07)', color:'var(--tertiary)'  },
]

function HoverCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{ transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', cursor: 'pointer', ...style }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 24px 60px rgba(20,27,43,0.12)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'var(--shadow)'; }}
    >
      {children}
    </div>
  )
}

function QuickCard({ href, icon: Icon, iconBg, iconColor, title, subtitle }: {
  href: string; icon: any; iconBg: string; iconColor: string; title: string; subtitle: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
      <div
        style={{
          background: 'var(--surface-lowest)', borderRadius: 'var(--r-2xl)',
          padding: '20px 16px', boxShadow: 'var(--shadow)', height: '100%',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.25s ease', cursor: 'pointer',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'var(--shadow)'; }}
      >
        <div style={{ width:40, height:40, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
          <Icon size={18} color={iconColor} />
        </div>
        <h4 style={{ fontWeight:800, fontSize:15, color:'var(--on-surface)', marginBottom:3 }}>{title}</h4>
        <p style={{ fontSize:12, color:'var(--on-surface-variant)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subtitle}</p>
      </div>
    </Link>
  )
}

export default function DashboardClient({ profile, stats, recentAnnouncements, openQuizzes }: Props) {
  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'คุณ'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .db-title { font-size: 38px; font-weight: 900; letter-spacing: -0.04em; color: var(--on-surface); line-height: 1.15; }
        .db-bento { display: grid; grid-template-columns: repeat(12,1fr); gap: 16px; }
        .db-hero  { grid-column: span 8; text-decoration: none; }
        .db-acts  { grid-column: span 4; display: flex; flex-direction: column; gap: 14px; }
        .db-ann   { grid-column: span 6; background: var(--surface-lowest); border-radius: var(--r-2xl); padding: 20px; box-shadow: var(--shadow); min-width: 0; }
        .db-qz    { grid-column: span 6; background: var(--surface-lowest); border-radius: var(--r-2xl); padding: 20px; box-shadow: var(--shadow); min-width: 0; }
        .db-hero-box {
          background: linear-gradient(135deg, #0050cb 0%, #0066ff 100%);
          border-radius: var(--r-2xl); padding: 28px 28px;
          box-shadow: var(--shadow-primary-lg);
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; justify-content: space-between;
          min-height: 200px; color: white; cursor: pointer;
          transition: all 0.25s ease; height: 100%;
        }
        .db-hero-title { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 6px; }
        .db-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 14px; }

        @media (max-width: 767px) {
          .db-title      { font-size: 26px; }
          .db-bento      { grid-template-columns: 1fr; gap: 12px; }
          .db-hero       { grid-column: span 1; }
          .db-acts       { grid-column: span 1; flex-direction: row; gap: 10px; }
          .db-ann        { grid-column: span 1; }
          .db-qz         { grid-column: span 1; }
          .db-hero-box   { min-height: 160px; padding: 20px 18px; }
          .db-hero-title { font-size: 20px; }
          .db-stat-grid  { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      {/* ── Welcome ── */}
      <div className="fade-up" style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6 }}>
          Student Dashboard
        </p>
        <h2 className="db-title">
          Welcome back,<br />
          <span className="text-gradient">{name}</span> 👋
        </h2>
      </div>

      {/* ── Stat Cards (Admin only) ── */}
      {isAdmin && (
        <div className="stagger db-stat-grid">
          {STAT_CARDS(stats).map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }} className="fade-up">
              <HoverCard style={{ background: 'var(--surface-lowest)', borderRadius: 'var(--r-2xl)', padding: '20px 18px', boxShadow: 'var(--shadow)' }}>
                <div style={{ width:38, height:38, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                  <s.icon size={18} color={s.color} />
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 4, fontWeight: 600 }}>{s.unit}</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:10, fontSize:12, fontWeight:700, color:s.color }}>
                  {s.label} <ArrowRight size={12} />
                </div>
              </HoverCard>
            </Link>
          ))}
        </div>
      )}

      {/* ── Bento Grid ── */}
      <div className="db-bento">

        {/* Hero card — links to media */}
        <Link href="/dashboard/media" className="db-hero fade-up">
          <div
            className="db-hero-box"
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 30px 70px rgba(0,80,203,0.4)'; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'var(--shadow-primary-lg)'; el.style.transform = 'translateY(0)'; }}
          >
            <div style={{ position:'absolute', right:-50, bottom:-50, width:200, height:200, background:'rgba(255,255,255,0.1)', borderRadius:'50%', filter:'blur(40px)', pointerEvents:'none' }} />
            <div>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight:700, marginBottom:14 }}>
                <Play size={12} fill="white" /> สื่อการเรียน
              </span>
              <h3 className="db-hero-title">เริ่มเรียนรู้วันนี้</h3>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:13, fontWeight:500 }}>สื่อการสอน วิดีโอ และเนื้อหาสรุปครบครัน</p>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', padding:'9px 18px', borderRadius:99, fontSize:12, fontWeight:700, color:'white' }}>
                เข้าดูสื่อ <ArrowRight size={13} />
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions */}
        <div className="db-acts">
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

        {/* Announcements list */}
        <div className="db-ann fade-up">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:10, background:'rgba(0,80,203,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Megaphone size={14} color="var(--primary)" />
              </div>
              <span style={{ fontWeight:800, fontSize:14 }}>ประกาศล่าสุด</span>
            </div>
            <Link href="/dashboard/announcements" style={{ fontSize:12, color:'var(--primary)', textDecoration:'none', fontWeight:700 }}>ดูทั้งหมด →</Link>
          </div>
          {recentAnnouncements.length === 0
            ? <p style={{ color:'var(--outline)', fontSize:13, textAlign:'center', padding:'16px 0' }}>ยังไม่มีประกาศ</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {recentAnnouncements.map(a => (
                  <Link key={a.id} href="/dashboard/announcements" className="hover-row"
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 8px', borderRadius:'var(--r-lg)', textDecoration:'none', transition:'background 0.15s' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{a.type==='scores'?'📊':a.type==='image'?'🖼️':'📢'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--on-surface)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                      <p style={{ fontSize:10, color:'var(--outline)', marginTop:1 }}>{new Date(a.created_at).toLocaleDateString('th-TH')}</p>
                    </div>
                    {a.is_important && <span className="badge badge-blue" style={{ flexShrink:0, fontSize:9 }}>สำคัญ</span>}
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Open Quizzes list */}
        <div className="db-qz fade-up">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:10, background:'rgba(67,69,209,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ClipboardList size={14} color="var(--tertiary)" />
              </div>
              <span style={{ fontWeight:800, fontSize:14 }}>แบบทดสอบที่เปิด</span>
            </div>
            <Link href="/dashboard/quizzes" style={{ fontSize:12, color:'var(--primary)', textDecoration:'none', fontWeight:700 }}>ดูทั้งหมด →</Link>
          </div>
          {openQuizzes.length === 0
            ? <p style={{ color:'var(--outline)', fontSize:13, textAlign:'center', padding:'16px 0' }}>ยังไม่มีแบบทดสอบที่เปิด</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {openQuizzes.map(q => (
                  <Link key={q.id} href={`/dashboard/quizzes/${q.id}/terms`} className="hover-card"
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 12px', borderRadius:'var(--r-xl)', background:'var(--surface-low)', textDecoration:'none', transition:'all 0.18s', cursor:'pointer' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--on-surface)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.title}</p>
                      <p style={{ fontSize:11, color:'var(--outline)', marginTop:2 }}>
                        ผ่าน {q.pass_score}% {q.time_limit ? `· ${q.time_limit} นาที` : '· ไม่จำกัดเวลา'}
                      </p>
                    </div>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#0050cb,#0066ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8, boxShadow:'0 4px 12px rgba(0,80,203,0.25)' }}>
                      <ArrowRight size={13} color="white" />
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