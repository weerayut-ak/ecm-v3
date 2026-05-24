import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, Lock, AlertTriangle } from 'lucide-react'
import RefreshButton from '@/components/RefreshButton'

export default async function QuizzesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: quizzes }, { data: mySubmissions }, { data: mySessions }, { data: profile }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, title, description, pass_score, time_limit, is_open, opens_at, closes_at, grade_filter, questions(count)')
      .order('created_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('quiz_id, score, is_passed, submitted_at')
      .eq('student_id', user.id),
    supabase
      .from('quiz_sessions')
      .select('quiz_id, leave_count, status')
      .eq('student_id', user.id),
    supabase
      .from('profiles')
      .select('grade, role')
      .eq('id', user.id)
      .single(),
  ])

  const studentGrade = profile?.grade
  const isAdmin = profile?.role === 'admin'

  // กรองแบบทดสอบตาม grade — admin เห็นทั้งหมด, นักเรียนเห็นเฉพาะที่กำหนดให้
  const visibleQuizzes = (quizzes ?? []).filter(q => {
    if (isAdmin) return true
    const gf = (q as any).grade_filter as string[] | null
    if (!gf || gf.length === 0) return true   // ไม่จำกัดชั้น → ทุกคนเห็น
    if (!studentGrade) return true              // นักเรียนยังไม่ระบุชั้น → เห็นทั้งหมด
    return gf.includes(studentGrade)
  })

  const submissionMap = new Map(mySubmissions?.map(s => [s.quiz_id, s]) ?? [])
  const sessionMap    = new Map(mySessions?.map(s => [s.quiz_id, s]) ?? [])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>แบบทดสอบ</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              {visibleQuizzes.filter(q => q.is_open).length} ชุดที่เปิดอยู่
              {studentGrade && !isAdmin && (
                <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--blue-light, #eff6ff)', color: 'var(--primary, #1d4ed8)', padding: '1px 8px', borderRadius: 6 }}>
                  ชั้น {studentGrade}
                </span>
              )}
            </p>
          </div>
          <RefreshButton />
        </div>
      </div>

      {visibleQuizzes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js" type="module" />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* @ts-expect-error custom element */}
            <dotlottie-wc
              src="https://lottie.host/a5ff41ee-a74e-4e56-825f-2a30531e1d2e/cL2tj4Bads.lottie"
              style={{ width: 220, height: 220 }}
              autoplay
              loop
            />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginTop: 8 }}>
            ยังไม่มีแบบทดสอบสำหรับชั้นของคุณ
          </p>
          {studentGrade && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>ชั้น {studentGrade}</p>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {visibleQuizzes.map(q => {
          const submission = submissionMap.get(q.id)
          const session    = sessionMap.get(q.id)
          const qCount     = (q.questions as { count: number }[])?.[0]?.count ?? 0
          const leaveCount = session?.leave_count ?? 0
          const isBlocked  = session?.status === 'blocked' || leaveCount >= 3
          const gradeFilter = (q as any).grade_filter as string[] | null

          return (
            <div key={q.id} className="card" style={{
              opacity: (!q.is_open && !submission) ? 0.65 : 1,
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4, flex: 1 }}>{q.title}</h3>
                <span className={`badge flex-shrink-0 ${q.is_open ? 'badge-green' : 'badge-red'}`}>
                  {q.is_open ? 'เปิด' : 'ปิด'}
                </span>
              </div>

              {q.description && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  {q.description}
                </p>
              )}

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span><span>{qCount} ข้อ</span>
                  <span style={{ color: 'var(--border-md)' }}>·</span>
                  <span>🎯 ผ่าน {q.pass_score}%</span>
                </div>
                {q.time_limit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} /><span>{q.time_limit} นาที</span>
                  </div>
                )}
                {q.opens_at && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    📅 {new Date(q.opens_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    {' – '}
                    {new Date(q.closes_at!).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Grade badges */}
              {isAdmin && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {gradeFilter && gradeFilter.length > 0
                    ? gradeFilter.map(g => (
                        <span key={g} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                          {g}
                        </span>
                      ))
                    : <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>ทุกชั้น</span>
                  }
                </div>
              )}

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
                ) : q.is_open ? (
                  <Link
                    href={`/dashboard/quizzes/${q.id}/terms`}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}
                  >
                    {leaveCount > 0 ? '▶ ทำต่อ' : '▶ เริ่มทำแบบทดสอบ'}
                  </Link>
                ) : (
                  <button className="btn" disabled style={{ width: '100%', justifyContent: 'center' }}>
                    ยังไม่เปิด
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