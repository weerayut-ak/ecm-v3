import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, Lock, AlertTriangle } from 'lucide-react'
import RefreshButton from '@/components/RefreshButton'

export default async function QuizzesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: quizzes }, { data: mySubmissions }, { data: mySessions }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, title, description, pass_score, time_limit, is_open, opens_at, closes_at, questions(count)')
      .order('created_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('quiz_id, score, is_passed, submitted_at')
      .eq('student_id', user.id),
    supabase
      .from('quiz_sessions')
      .select('quiz_id, leave_count, status')
      .eq('student_id', user.id),
  ])

  const submissionMap = new Map(mySubmissions?.map(s => [s.quiz_id, s]) ?? [])
  const sessionMap    = new Map(mySessions?.map(s => [s.quiz_id, s]) ?? [])

  // ── คำนวณ effective open state ณ เวลาปัจจุบัน ──────────────────────────
  // เพื่อให้นักเรียนเห็นสถานะที่ถูกต้องแม้ is_open ใน DB ยังไม่ได้ sync
  const now = new Date()

  function getEffectivelyOpen(q: {
    is_open: boolean
    opens_at: string | null
    closes_at: string | null
  }): boolean {
    if (q.opens_at && q.closes_at) {
      // มีตั้งเวลาครบทั้งคู่ → ดูจากช่วงเวลาอย่างเดียว (ไม่สนใจ is_open)
      return new Date(q.opens_at) <= now && new Date(q.closes_at) >= now
    }
    if (q.opens_at) {
      // มีแค่วันเปิด (ไม่มีวันปิด) → เปิดเมื่อถึงเวลา และไม่มีวันหมด
      return new Date(q.opens_at) <= now
    }
    // ไม่ได้ตั้งตาราง → ใช้ is_open จาก admin โดยตรง
    return q.is_open
  }
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>แบบทดสอบ</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
            {quizzes?.filter(q => getEffectivelyOpen(q)).length ?? 0} ชุดที่เปิดอยู่
          </p>
        </div>
        <RefreshButton />
      </div>

      {quizzes?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p>ยังไม่มีแบบทดสอบ</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {quizzes?.map(q => {
          const submission      = submissionMap.get(q.id)
          const session         = sessionMap.get(q.id)
          const qCount          = (q.questions as { count: number }[])?.[0]?.count ?? 0
          const leaveCount      = session?.leave_count ?? 0
          const isBlocked       = session?.status === 'blocked' || leaveCount >= 3

          // ✅ ใช้ effectivelyOpen แทน q.is_open ทุกที่ที่เกี่ยวกับนักเรียน
          const effectivelyOpen = getEffectivelyOpen(q)

          // คำนวณสถานะ schedule เพื่อแสดง label ที่ชัดขึ้น
          const hasSchedule     = !!(q.opens_at || q.closes_at)
          const scheduledFuture = q.opens_at ? new Date(q.opens_at) > now : false
          const scheduledEnded  = q.closes_at ? new Date(q.closes_at) < now : false

          return (
            <div key={q.id} className="card" style={{
              opacity: (!effectivelyOpen && !submission) ? 0.65 : 1,
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4, flex: 1 }}>{q.title}</h3>
                <span className={`badge flex-shrink-0 ${effectivelyOpen ? 'badge-green' : 'badge-red'}`}>
                  {effectivelyOpen ? 'เปิด' : scheduledEnded ? 'หมดเวลา' : 'ปิด'}
                </span>
              </div>

              {q.description && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  {q.description}
                </p>
              )}

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span>
                  <span>{qCount} ข้อ</span>
                  <span style={{ color: 'var(--border-md)' }}>·</span>
                  <span>🎯 ผ่าน {q.pass_score}%</span>
                </div>
                {q.time_limit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} />
                    <span>{q.time_limit} นาที</span>
                  </div>
                )}
                {q.opens_at && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    📅 {new Date(q.opens_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {q.closes_at && (
                      <> – {new Date(q.closes_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </div>
                )}
                {/* แสดง countdown เมื่อยังไม่ถึงเวลาเปิด */}
                {hasSchedule && scheduledFuture && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                    ⏳ ยังไม่ถึงเวลาเปิด
                  </div>
                )}
              </div>

              {/* Leave warning */}
              {leaveCount > 0 && !submission && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                  borderRadius: 8, marginBottom: 10, fontSize: 12, fontWeight: 600,
                  background: isBlocked ? 'var(--red-light)' : 'var(--amber-light)',
                  color:      isBlocked ? 'var(--red)'       : 'var(--amber)',
                }}>
                  <AlertTriangle size={12} />
                  {isBlocked ? 'ถูกล็อค — รอแอดมินอนุญาต' : `ออกไปแล้ว ${leaveCount}/3 ครั้ง`}
                </div>
              )}

              {/* Action */}
              <div style={{ marginTop: 'auto' }}>
                {submission ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                      borderRadius: 10, fontSize: 13,
                      background: submission.is_passed ? 'var(--green-light)' : 'var(--red-light)',
                      color:      submission.is_passed ? 'var(--green)'       : 'var(--red)',
                    }}>
                      {submission.is_passed ? <CheckCircle size={15} /> : <XCircle size={15} />}
                      <span style={{ fontWeight: 700 }}>
                        {submission.score?.toFixed(0)}% · {submission.is_passed ? 'ผ่าน ✓' : 'ไม่ผ่าน'}
                      </span>
                    </div>
                    <Link href={`/dashboard/quizzes/${q.id}/result`} className="btn btn-sm"
                      style={{ justifyContent: 'center', fontSize: 12 }}>
                      ดูผลคะแนน
                    </Link>
                  </div>
                ) : isBlocked ? (
                  <button className="btn" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed' }}>
                    <Lock size={13} /> ถูกล็อค
                  </button>
                ) : effectivelyOpen ? (
                  // ✅ ใช้ effectivelyOpen แทน q.is_open
                  <Link
                    href={`/dashboard/quizzes/${q.id}/terms`}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}
                  >
                    {leaveCount > 0 ? '▶ ทำต่อ' : '▶ เริ่มทำแบบทดสอบ'}
                  </Link>
                ) : (
                  <button className="btn" disabled style={{ width: '100%', justifyContent: 'center' }}>
                    {scheduledFuture ? '⏳ ยังไม่ถึงเวลา' : scheduledEnded ? 'หมดเวลาแล้ว' : 'ยังไม่เปิด'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}