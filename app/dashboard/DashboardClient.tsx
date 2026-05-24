'use client'

import React, { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Megaphone, 
  ClipboardList, 
  ArrowRight, 
  Users, 
  Play, 
  Zap, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Flame, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Volume2,
  Lock,
  UserCheck,
  ExternalLink,
  BarChart2,
} from 'lucide-react'

// ─── Portal: render ตรงไปที่ document.body หลีก backdrop-filter stacking context ของ Topbar ───
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPortal } = require('react-dom') as typeof import('react-dom')
  return createPortal(children, document.body) as React.ReactElement
}

interface Props {
  profile?: { role: 'admin' | 'student' | string; nickname?: string; full_name?: string }
  stats?: { students: number; quizzes: number; announcements: number; media: number }
  recentAnnouncements?: { id: string; title: string; is_important: boolean; created_at: string; type: string; content?: string }[]
  openQuizzes?: { id: string; title: string; pass_score: number; time_limit: number | null; total_questions?: number; description?: string }[]
  pinnedLessons?: {
    id: string; type?: 'knowledge' | 'video' | 'pdf' | 'drive' | string; title: string
    description?: string | null; content?: string | null; video_url?: string | null
    duration?: string | null; tags?: string[]; file_url?: string | null
    drive_url?: string | null; is_pinned?: boolean; created_at?: string; updated_at?: string
    thumbnail_url?: string; last_viewed?: string; tag?: string; tag_color?: string
    badge?: string; badge_color?: string
  }[]
  // ── stats card ──
  myStats?: {
    totalSubmissions: number
    avgScore: number
    passedCount: number
    pendingCount: number   // openQuizzes ที่ยังไม่ได้ส่ง
  }
  quizPassStats?: {
    quizId: string
    title: string
    passed: number
    failed: number
    total: number
  }[]
  appointments?: {
    id: string
    title: string
    date: string         // 'YYYY-MM-DD'
    time?: string | null
    description?: string | null
    location?: string | null
  }[]
}

// แปลงลิงก์ YouTube เป็น Embed URL
function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`
  return url
}

// แปลงลิงก์ Google Drive เป็น Embed URL สำหรับแสดงผล
function toDriveEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return url
}

// ดึงรูปหน้าปกของ YouTube จริงๆ มาแสดงผล
function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null
  const m1 = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/)
  if (m1) return `https://img.youtube.com/vi/${m1[1]}/hqdefault.jpg`
  const m2 = url.match(/youtu\.be\/([\w-]+)/)
  if (m2) return `https://img.youtube.com/vi/${m2[1]}/hqdefault.jpg`
  return null
}

// ดึงรูปปกขนาดเล็กของ Google Drive ไฟล์
function getDriveThumbnail(url: string | null | undefined): string | null {
  if (!url) return null
  const m1 = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w400`
  const m2 = url.match(/[?&]id=([\w-]+)/)
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`
  return null
}

// วิเคราะห์ดึงรูปปกสื่อการสอนปักหมุดตามรูปแบบ
function getThumb(item: any): string | null {
  if (!item) return null
  if (item.type === 'video') return getYouTubeThumbnail(item.video_url)
  if (item.type === 'drive') return getDriveThumbnail(item.drive_url)
  if (item.type === 'pdf') return 'https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=400&auto=format&fit=crop'
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'
}

const getThaiDateString = () => {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
  const date = new Date()
  return `วัน${days[date.getDay()]}ที่ ${date.getDate()} ${months[date.getMonth()]} พ.ศ. ${date.getFullYear() + 543}`
}

// ── MiniCalendar ────────────────────────────────────────────────────────────────
function MiniCalendar({
  apptByDate,
  today,
}: {
  apptByDate: Record<string, { id: string; title: string; time?: string | null }[]>
  today: Date
}) {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1 // 0 = Monday
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const thaiDays = ['จ','อ','พ','พฤ','ศ','ส','อา']
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h4 className="font-extrabold text-sm text-slate-800">
          {thaiMonths[month]} {year + 543}
        </h4>
        <button
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {thaiDays.map(d => (
          <div key={d} className="text-center text-[10px] font-extrabold text-slate-400 pb-1">{d}</div>
        ))}
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startDow + 1
          if (dayNum < 1 || dayNum > lastDay.getDate()) return <div key={i} />
          const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
          const hasAppt = !!(apptByDate[dateKey]?.length)
          const isToday = dateKey === todayKey
          return (
            <div
              key={i}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1 ${
                isToday ? 'bg-indigo-600 text-white' : hasAppt ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-bold leading-tight">{dayNum}</span>
              {hasAppt && (
                <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-amber-300' : 'bg-indigo-500'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AppointmentTimeline: แทนที่ STAT CARDS ──────────────────────────────────────
function AppointmentTimeline({
  appointments = [],
}: {
  appointments: { id: string; title: string; date: string; time?: string | null; description?: string | null; location?: string | null }[]
}) {
  const [showCalendar, setShowCalendar] = useState(false)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // สัปดาห์ปัจจุบัน (จันทร์–อาทิตย์)
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const thaiDayNames = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']

  // จัดกลุ่ม appointments ตามวันที่
  const apptByDate: Record<string, typeof appointments> = {}
  for (const a of appointments) {
    const key = a.date.split('T')[0]
    if (!apptByDate[key]) apptByDate[key] = []
    apptByDate[key].push(a)
  }

  // upcoming (วันนี้เป็นต้นไป สูงสุด 10 รายการ)
  const upcoming = [...appointments]
    .filter(a => a.date.split('T')[0] >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1.5 bg-indigo-600 rounded-full" />
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Timeline สัปดาห์นี้</h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-full font-extrabold">
            วันนัดหมาย
          </span>
        </div>
        <button
          onClick={() => setShowCalendar(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all ${
            showCalendar
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {showCalendar ? 'ซ่อนปฏิทิน' : 'ดูปฏิทินทั้งเดือน'}
          {showCalendar
            ? <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
            : <ChevronDown className="w-3.5 h-3.5 transition-transform" />
          }
        </button>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
          const dayAppts = apptByDate[key] ?? []
          const isToday = key === todayKey
          const isPast = key < todayKey
          return (
            <div
              key={key}
              className={`rounded-2xl px-2 py-3 border text-center flex flex-col items-center gap-1.5 transition-all duration-200 ${
                isToday
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : isPast
                    ? 'bg-slate-50 border-slate-100 text-slate-400'
                    : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <span className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>
                {thaiDayNames[i]}
              </span>
              <span className="text-lg sm:text-xl font-black leading-none">{day.getDate()}</span>
              {dayAppts.length > 0 ? (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-amber-300' : 'bg-indigo-500'}`} />
                  <span className={`text-[8px] sm:text-[9px] font-bold leading-tight line-clamp-1 w-full px-0.5 ${isToday ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    {dayAppts[0].title}
                  </span>
                  {dayAppts.length > 1 && (
                    <span className={`text-[8px] ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>
                      +{dayAppts.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white/30' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Collapsible: Mini Calendar + Upcoming list */}
      {showCalendar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <MiniCalendar apptByDate={apptByDate} today={today} />

          {/* Upcoming list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              วันนัดหมายที่กำลังจะมาถึง
            </h4>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">ไม่มีวันนัดหมายในช่วงนี้</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scroll">
                {upcoming.map(a => {
                  const d = new Date(a.date)
                  const isApptToday = a.date.split('T')[0] === todayKey
                  const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
                  return (
                    <div
                      key={a.id}
                      className={`flex gap-3 p-2.5 rounded-xl border ${isApptToday ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <div className={`flex-shrink-0 w-11 text-center rounded-xl py-1 ${isApptToday ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                        <div className="text-[9px] font-bold">{thMonths[d.getMonth()]}</div>
                        <div className="text-base font-black leading-none">{d.getDate()}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 leading-snug line-clamp-1">{a.title}</p>
                        {a.time && (
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{a.time}
                          </p>
                        )}
                        {a.location && (
                          <p className="text-[10px] text-slate-400 mt-0.5">📍 {a.location}</p>
                        )}
                        {a.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{a.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── AdminPassStats: แยก component เพราะมี useState ของตัวเอง ──────────────────
function AdminPassStats({ quizPassStats }: {
  quizPassStats: { quizId: string; title: string; passed: number; failed: number; total: number }[]
}) {
  const [selectedId, setSelectedId] = useState<string>(quizPassStats[0]?.quizId ?? '')
  const stat = quizPassStats.find(q => q.quizId === selectedId) ?? quizPassStats[0]
  const passRate = stat && stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 0

  return (
    <div className="bg-[#1e1145] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl" />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 bg-violet-400/20 border border-violet-400/20 rounded-full">
            <Users className="w-4 h-4 text-violet-300" />
          </span>
          <h4 className="font-extrabold text-sm text-slate-100">ผลสอบทั้งห้อง</h4>
        </div>

        {quizPassStats.length > 0 ? (
          <>
            {/* Filter dropdown */}
            <div className="relative">
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl px-3 py-2 pr-8 appearance-none outline-none cursor-pointer hover:bg-white/15 transition"
                style={{ colorScheme: 'dark' }}
              >
                {quizPassStats.map(q => (
                  <option key={q.quizId} value={q.quizId} style={{ background: '#1e1145' }}>
                    {q.title}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
            </div>

            {stat && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-emerald-400">{stat.passed}</div>
                    <div className="text-[10px] text-emerald-300 font-bold mt-0.5">ผ่านเกณฑ์</div>
                  </div>
                  <div className="bg-rose-500/15 border border-rose-500/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-rose-400">{stat.failed}</div>
                    <div className="text-[10px] text-rose-300 font-bold mt-0.5">ยังไม่ผ่าน</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-300">อัตราผ่าน</span>
                    <span className="text-emerald-400 font-black">{passRate}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-indigo-950 rounded-full overflow-hidden border border-indigo-900/30">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${passRate}%`,
                        background: passRate >= 70
                          ? 'linear-gradient(to right,#34d399,#10b981)'
                          : passRate >= 50
                          ? 'linear-gradient(to right,#fbbf24,#f59e0b)'
                          : 'linear-gradient(to right,#f87171,#ef4444)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-indigo-400">ส่งแล้ว {stat.total} คน</p>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-xs text-indigo-300/80 leading-relaxed">ยังไม่มีการส่งแบบทดสอบในระบบ</p>
        )}
      </div>
    </div>
  )
}

export default function App({ 
  profile, 
  stats = { students: 0, quizzes: 0, announcements: 0, media: 0 }, 
  recentAnnouncements = [], 
  openQuizzes = [],
  pinnedLessons = [],
  myStats,
  quizPassStats = [],
  appointments = [],
}: Props) {
  const isAdmin = profile?.role === 'admin'
  const name = profile?.nickname ?? profile?.full_name ?? 'ผู้เรียน'
  const [thaiDate, setThaiDate] = useState('')
  const [activeVideo, setActiveVideo] = useState<{ id?: string; title: string; url: string; type?: string } | null>(null)
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ id?: string; title: string; date: string; content: string; type: string } | null>(null)
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null)

  useEffect(() => { setThaiDate(getThaiDateString()) }, [])

  // ล็อก body scroll เมื่อ modal เปิด
  useEffect(() => {
    const anyOpen = !!(activeVideo || activeAnnouncement || activeQuiz)
    document.body.style.overflow = anyOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [activeVideo, activeAnnouncement, activeQuiz])

  const getAnnouncementBadgeStyle = (type: string) => {
    switch (type) {
      case 'scores': return { label: 'ข่าวสารห้องเรียน', className: 'bg-blue-50 text-blue-600 border border-blue-100' }
      case 'image':  return { label: 'กิจกรรมเสริม',     className: 'bg-emerald-50 text-emerald-600 border border-emerald-100' }
      default:       return { label: 'ประกาศระบบ',        className: 'bg-rose-50 text-rose-600 border border-rose-200' }
    }
  }

  const hasPinnedLessons = pinnedLessons && pinnedLessons.length > 0
  const featuredLesson = hasPinnedLessons ? pinnedLessons[0] : null

  const getPlayUrl = (lesson: any) =>
    lesson.type === 'video'  ? toEmbedUrl(lesson.video_url) :
    lesson.type === 'drive'  ? toDriveEmbedUrl(lesson.drive_url ?? null) :
    (lesson.file_url ?? null)

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16 px-4 md:px-8 font-sans antialiased selection:bg-blue-500 selection:text-white">
      <div className="max-w-[1200px] mx-auto space-y-8 pt-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-wider text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/50">
                STUDENT DASHBOARD
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                {isAdmin ? 'สิทธิ: ผู้ดูแลระบบ' : 'สิทธิ: ผู้เรียน'}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 flex items-center flex-wrap gap-2">
              <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">School</span>
              
              <span className="text-xl md:text-2xl font-light text-slate-400 mx-1">|</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-extrabold text-2xl md:text-3xl">สวัสดี, {name}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 px-4 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all duration-300 w-fit self-start md:self-auto">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs md:text-sm font-bold text-slate-700 tracking-wide">{thaiDate || 'กำลังโหลดวันที่...'}</span>
          </div>
        </div>

        {/* APPOINTMENT TIMELINE */}
        <AppointmentTimeline appointments={appointments ?? []} />

        {/* HERO BANNER */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-[28px] overflow-hidden p-6 md:p-8 shadow-xl shadow-blue-950/15 border border-blue-600/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/25 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {featuredLesson ? (
              <>
                <div className="lg:col-span-7 space-y-6">
                  <span className="inline-flex items-center gap-1.5 bg-blue-500/30 border border-blue-400/30 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-extrabold text-blue-100 tracking-wide">
                    <Play className="w-3 h-3 fill-current animate-pulse text-emerald-400" /> วิดีโอปักหมุดแนะนำล่าสุด
                  </span>
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">{featuredLesson.title}</h2>
                    <p className="text-blue-100 text-sm md:text-base leading-relaxed font-medium max-w-xl opacity-95">
                      {featuredLesson.description || 'กดเล่นวิดีโอเพื่อเริ่มต้นบทเรียนแนะนำของสัปดาห์นี้'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => { const u = getPlayUrl(featuredLesson); if (u) setActiveVideo({ id: featuredLesson.id, title: featuredLesson.title, url: u, type: featuredLesson.type }) }}
                      className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
                      <Play className="w-4 h-4 fill-current text-blue-600" /><span>เล่นวิดีโอแนะนำ</span>
                    </button>
                    <a href={`/dashboard/media/${featuredLesson.id}`}
                      className="inline-flex items-center gap-2 bg-blue-600/60 hover:bg-blue-600/80 border border-blue-400/40 text-white px-5 py-3 rounded-xl font-bold text-sm backdrop-blur-sm transition-all active:scale-95">
                      <ExternalLink className="w-4 h-4" /><span>ไปยังห้องเรียนบทนี้</span>
                    </a>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div onClick={() => { const u = getPlayUrl(featuredLesson); if (u) setActiveVideo({ id: featuredLesson.id, title: featuredLesson.title, url: u, type: featuredLesson.type }) }}
                    className="relative bg-slate-950/45 border border-white/10 rounded-2xl overflow-hidden aspect-video shadow-2xl group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url('${getThumb(featuredLesson) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}')` }} />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white transition-all duration-300 shadow-lg">
                        <Play className="w-6 h-6 text-white group-hover:text-blue-700 fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
                      <h4 className="font-bold text-sm tracking-wide line-clamp-1">{featuredLesson.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">กดรับชมเพื่อเข้าบทเรียนบทนี้ได้ทันที</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="lg:col-span-12 py-6 text-center space-y-4">
                <span className="inline-flex items-center gap-1.5 bg-blue-500/30 border border-blue-400/30 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-extrabold text-blue-100 tracking-wide">
                  <BookOpen className="w-3.5 h-3.5 text-blue-200" /> ยินดีต้อนรับสู่ห้องเรียนออนไลน์
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">พร้อมที่จะเริ่มต้นความรู้บทเรียนใหม่แล้วหรือยัง?</h2>
                <p className="text-blue-100 text-sm md:text-base leading-relaxed max-w-2xl mx-auto opacity-95">
                  คุณสามารถค้นหาข้อมูลวิดีโอหลัก สไลด์บทสรุปวิชาเรียน และระบบแบบทดสอบได้จากหมวดหมู่ต่างๆ ในระบบ
                </p>
                <div className="pt-2">
                  <a href="/dashboard/media" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all">
                    <span>ค้นหาบทเรียนทั้งหมด</span><ArrowRight className="w-4 h-4 text-blue-600" />
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* PINNED LESSONS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1.5 bg-blue-600 rounded-full" />
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">วิดีโอบทเรียนแนะนำปักหมุด (Pinned Video Lessons)</h3>
            </div>
            <a href="/dashboard/media" className="text-xs md:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>คลังสื่อทั้งหมด</span><ChevronRight className="w-4 h-4" />
            </a>
          </div>
          {pinnedLessons.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
              <p className="text-slate-400 font-medium text-sm">ยังไม่มีวิดีโอบทเรียนปักหมุดในระบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pinnedLessons.map(lesson => (
                <div key={lesson.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                  <div onClick={() => { const u = getPlayUrl(lesson); if (u) setActiveVideo({ id: lesson.id, title: lesson.title, url: u, type: lesson.type }) }}
                    className="relative aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer group">
                    <div className="absolute inset-0 bg-slate-950/25 z-10" />
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${getThumb(lesson) || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400&auto=format&fit=crop'}')` }} />
                    <div className="absolute top-3.5 left-3.5 z-20">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-blue-600 text-white tracking-wider shadow">
                        {lesson.type ? lesson.type.toUpperCase() : 'PINNED'}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center">
                      <span className="inline-flex items-center gap-1 bg-black/55 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur-sm">
                        <Clock className="w-3 h-3 text-amber-400" />{lesson.duration || 'ไม่ระบุเวลา'}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-indigo-600 text-white shadow">
                        {lesson.tags && lesson.tags.length > 0 ? lesson.tags[0] : 'บทเรียน'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-blue-600 transition-colors">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{lesson.description || 'ไม่มีคำอธิบายสำหรับบทเรียนปักหมุดนี้'}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 font-bold">{lesson.last_viewed ? `แก้ไขล่าสุด: ${lesson.last_viewed}` : 'บทเรียน in system'}</span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => { const u = getPlayUrl(lesson); if (u) setActiveVideo({ id: lesson.id, title: lesson.title, url: u, type: lesson.type }) }}
                          className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-2.5 py-1.5 rounded-lg inline-flex items-center justify-center gap-1 transition active:scale-95 border border-slate-200">
                          <Play className="w-3 h-3 fill-current text-slate-700" /><span>เล่นย่อ</span>
                        </button>
                        <a href={`/dashboard/media/${lesson.id}`}
                          className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg inline-flex items-center justify-center gap-1 transition active:scale-95 shadow-sm">
                          <span>ไปห้องเรียน</span><ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TWO COLUMN: ANNOUNCEMENTS & QUIZZES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Announcements */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-amber-500 rounded-full" />
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">รายละเอียดประกาศล่าสุด</h3>
              </div>
              <a href="/dashboard/announcements" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <span>ประกาศทั้งหมด</span><ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="space-y-3">
              {recentAnnouncements.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
                  <p className="text-slate-400 font-medium text-sm">ไม่มีประกาศล่าสุดในขณะนี้</p>
                </div>
              ) : recentAnnouncements.map((ann) => {
                const badge = getAnnouncementBadgeStyle(ann.type)
                const formattedDate = new Date(ann.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <div key={ann.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition duration-300 relative group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                        <span className="text-[11px] text-slate-400 font-bold inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />{formattedDate}
                        </span>
                        {ann.is_important && (
                          <span className="text-[9px] font-black tracking-wide text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md">สำคัญ</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => setActiveAnnouncement({ id: ann.id, title: ann.title, date: formattedDate, content: ann.content || 'ไม่มีรายละเอียดเพิ่มเติม', type: badge.label })}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md transition">
                          อ่านด่วน
                        </button>
                        <a href={`/dashboard/announcements#ann-${ann.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition flex items-center gap-0.5">
                          <span>ไปหน้าประกาศ</span><ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition duration-200">{ann.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-2 line-clamp-2">
                      {ann.content || 'อ่านรายละเอียดประกาศฉบับเต็มเพื่อทราบกำหนดการและข้อมูลเพิ่มเติม'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quizzes */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-1.5 bg-indigo-500 rounded-full" />
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">แบบทดสอบที่เปิดทำ</h3>
                </div>
                <a href="/dashboard/quizzes" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <span>แบบทดสอบทั้งหมด</span><ChevronRight className="w-4 h-4" />
                </a>
              </div>
              {openQuizzes.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
                  <p className="text-slate-400 font-medium text-sm">ไม่มีแบบทดสอบเปิดให้ทำในขณะนี้</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openQuizzes.slice(0, 2).map((quiz) => (
                    <div key={quiz.id} className="bg-white rounded-2xl p-5 border-l-4 border-l-blue-600 border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="space-y-4">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded">🧭 ประเมินผลความรู้</span>
                        <div>
                          <h4 className="font-black text-base text-slate-900 tracking-tight">{quiz.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                            {quiz.description || 'แบบทดสอบออนไลน์เพื่อทบทวนทักษะความรู้ตามบทเรียนวิชาเรียนหลัก'}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 pt-1.5">
                          <div className="bg-emerald-50 border border-emerald-100/60 rounded-xl p-2.5 text-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                            <span className="block text-[10px] text-slate-400 font-bold">เกณฑ์ผ่าน</span>
                            <span className="block text-xs font-black text-emerald-700 mt-0.5">ผ่าน {quiz.pass_score}%</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100/60 rounded-xl p-2.5 text-center">
                            <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                            <span className="block text-[10px] text-slate-400 font-bold">เวลา</span>
                            <span className="block text-xs font-black text-amber-700 mt-0.5">{quiz.time_limit ? `${quiz.time_limit} นาที` : 'ไม่จำกัด'}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                            <ClipboardList className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                            <span className="block text-[10px] text-slate-400 font-bold">โจทย์ข้อสอบ</span>
                            <span className="block text-xs font-black text-slate-700 mt-0.5">{quiz.total_questions || 'N/A'} ข้อ</span>
                          </div>
                        </div>
                        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <span className="text-[10px] md:text-xs font-extrabold text-rose-500 tracking-wide">เปิดทำระบบอยู่ตอนนี้</span>
                          </div>
                          {isAdmin ? (
                            <button disabled title="สิทธิแอดมินไม่สามารถเข้าทำข้อสอบได้"
                              className="bg-slate-100 text-slate-400 font-extrabold px-5 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 border border-slate-200 cursor-not-allowed">
                              <Lock className="w-3.5 h-3.5" /><span>สำหรับนักเรียน</span>
                            </button>
                          ) : (
                            <button onClick={() => setActiveQuiz(quiz)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/15">
                              <span>เริ่มทำข้อสอบ</span><Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── STUDENT: สถิติภาพรวม ── */}
            {!isAdmin && (
              <div className="bg-[#1e1145] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-400/20 border border-indigo-400/20 rounded-full">
                        <BarChart2 className="w-4 h-4 text-indigo-300" />
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-100">สถิติการสอบของฉัน</h4>
                    </div>
                    <a href="/dashboard/quizzes" className="bg-white/10 border border-white/10 text-[10px] font-black px-2 py-0.5 rounded-full text-slate-200 hover:bg-white/20 transition">
                      ดูทั้งหมด
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/8 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-xl font-black text-fuchsia-300">{myStats?.totalSubmissions ?? 0}</div>
                      <div className="text-[10px] text-indigo-300 font-bold mt-0.5">ทำแล้ว</div>
                    </div>
                    <div className="bg-white/8 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-xl font-black text-amber-300">
                        {myStats?.avgScore != null ? `${Math.round(myStats.avgScore)}%` : '-'}
                      </div>
                      <div className="text-[10px] text-indigo-300 font-bold mt-0.5">เฉลี่ย</div>
                    </div>
                    <div className="bg-white/8 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-xl font-black text-rose-300">{myStats?.pendingCount ?? 0}</div>
                      <div className="text-[10px] text-indigo-300 font-bold mt-0.5">ค้างอยู่</div>
                    </div>
                  </div>

                  {(myStats?.totalSubmissions ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-indigo-300">ผ่านเกณฑ์</span>
                        <span className="text-emerald-400">
                          {myStats?.passedCount ?? 0} / {myStats?.totalSubmissions ?? 0} ชุด
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-indigo-950 rounded-full overflow-hidden border border-indigo-900/30">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${myStats?.totalSubmissions ? Math.round(((myStats.passedCount) / myStats.totalSubmissions) * 100) : 0}%`,
                            background: 'linear-gradient(to right,#34d399,#10b981)',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-300/80 leading-relaxed">
                      ยังไม่เคยส่งแบบทดสอบ เริ่มทำข้อสอบชุดแรกเพื่อดูสถิติของคุณที่นี่
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── ADMIN: ผลสอบแยกตามข้อสอบ ── */}
            {isAdmin && (
              <AdminPassStats quizPassStats={quizPassStats} />
            )}

          </div>
        </div>
      </div>

      {/* ── MODALS (ทั้งหมด render ผ่าน Portal ไปที่ document.body) ── */}

      {/* Video Modal */}
      {activeVideo && (
        <Portal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && setActiveVideo(null)}
          >
            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-slate-950/60 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-500 fill-current animate-pulse" />
                  <h3 className="font-bold text-sm text-slate-200 line-clamp-1">{activeVideo.title}</h3>
                </div>
                <button onClick={() => setActiveVideo(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                {activeVideo.url ? (
                  <iframe src={activeVideo.url} title={activeVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                    <Volume2 className="w-12 h-12 text-slate-600 animate-bounce" />
                    <p className="text-sm font-semibold">ไม่พบ URL สำหรับแสดงผลบทเรียนนี้</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-950/40 text-[11px] md:text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span>วิดีโอบทเรียนเรียนออนไลน์</span>
                  {activeVideo.id && (
                    <a 
                      href={`/dashboard/media/${activeVideo.id}`}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm shadow-blue-500/10"
                    >
                      <span>ไปยังห้องเรียนหลัก</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold w-fit">
                  <Volume2 className="w-3.5 h-3.5" /> High Quality Audio
                </span>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Announcement Modal */}
      {activeAnnouncement && (
        <Portal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && setActiveAnnouncement(null)}
          >
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200"
              style={{ maxHeight: '85vh' }}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <span className="inline-flex items-center bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black px-2.5 py-0.5 rounded">
                  {activeAnnouncement.type}
                </span>
                <button onClick={() => setActiveAnnouncement(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 block">{activeAnnouncement.date}</span>
                  <h3 className="font-extrabold text-lg text-slate-900 leading-snug">{activeAnnouncement.title}</h3>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{activeAnnouncement.content}</p>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end items-center bg-slate-50/30 flex-shrink-0">
                {activeAnnouncement.id && (
                  <a 
                    href={`/dashboard/announcements#ann-${activeAnnouncement.id}`}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-extrabold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 inline-flex items-center gap-1.5 mr-auto"
                  >
                    <span>ไปยังประกาศหลัก</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => setActiveAnnouncement(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition active:scale-95">
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Quiz Confirm Modal */}
      {activeQuiz && (
        <Portal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && setActiveQuiz(null)}
          >
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">ยืนยันการเริ่มทำข้อสอบ</span>
                <button onClick={() => setActiveQuiz(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Zap className="w-6 h-6 text-blue-600 fill-current animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-950 tracking-tight">{activeQuiz.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    {activeQuiz.description || 'กรุณาเตรียมตัวให้พร้อมก่อนเริ่มต้นทำแบบทดสอบ เมื่อกดเริ่มระบบจะเริ่มจับเวลาทันที'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">เกณฑ์ประเมินคะแนนผ่าน:</span>
                  <span className="text-emerald-700 font-black">ไม่ต่ำกว่า {activeQuiz.pass_score}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">ระยะเวลาจำกัดในการทำ:</span>
                  <span className="text-amber-700 font-black">{activeQuiz.time_limit ? `${activeQuiz.time_limit} นาที` : 'ไม่จำกัดเวลา'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">จำนวนข้อสอบประเมิน:</span>
                  <span className="text-slate-950 font-black">{activeQuiz.total_questions || 'N/A'} ข้อสอบ</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setActiveQuiz(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition active:scale-95">
                  ยกเลิก
                </button>
                <a href={`/dashboard/quizzes/${activeQuiz.id}/terms`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs transition active:scale-95 text-center flex items-center justify-center gap-1 shadow-md shadow-blue-500/20">
                  <span>เริ่มทำเลย</span><Play className="w-3.5 h-3.5 fill-current" />
                </a>
              </div>
            </div>
          </div>
        </Portal>
      )}

    </div>
  )
}