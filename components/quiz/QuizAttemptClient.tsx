'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTimer } from '@/hooks/useTimer'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import type { Quiz, Question } from '@/types/quiz'
import { AlertTriangle, Clock, ArrowLeft, ArrowRight, Send, LogOut, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_LEAVES = 3
const PENALTY_SECONDS = 60

// Option colours — A=blue, B=violet, C=emerald, D=amber
const OPT_COLORS = [
  { bg: 'rgba(37,99,235,0.08)',  border: '#2563eb', labelBg: '#2563eb', text: '#1d4ed8' },
  { bg: 'rgba(124,58,237,0.08)', border: '#7c3aed', labelBg: '#7c3aed', text: '#6d28d9' },
  { bg: 'rgba(5,150,105,0.08)',  border: '#059669', labelBg: '#059669', text: '#047857' },
  { bg: 'rgba(217,119,6,0.08)',  border: '#d97706', labelBg: '#d97706', text: '#b45309' },
  { bg: 'rgba(220,38,38,0.08)',  border: '#dc2626', labelBg: '#dc2626', text: '#b91c1c' },
]
const LABELS = ['A', 'B', 'C', 'D', 'E']

export default function QuizAttemptClient({
  quiz, questions, userId,
}: {
  quiz: Quiz
  questions: Question[]
  userId: string
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [warnings, setWarnings] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const startRef = useRef(Date.now())
  const supabase = createClient()

  useEffect(() => {
    supabase.from('quiz_sessions')
      .select('leave_count, status')
      .eq('student_id', userId).eq('quiz_id', quiz.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        if (data.status === 'blocked' || (data.leave_count ?? 0) >= MAX_LEAVES) {
          setBlocked(true); setWarnings(data.leave_count ?? MAX_LEAVES)
        } else if ((data.leave_count ?? 0) > 0) {
          setWarnings(data.leave_count ?? 0)
        }
      })
  }, [])

  const handleExpire = useCallback(() => {
    toast.error('⏰ หมดเวลาแล้ว! กำลังส่งอัตโนมัติ...', { duration: 4000 })
    doSubmit()
  }, [])

  const timer = useTimer({
    initialSeconds: quiz.time_limit ? quiz.time_limit * 60 : 0,
    onExpire: handleExpire,
    autoStart: !!quiz.time_limit,
  })

  useLeaveGuard({
    enabled: !submitting && !blocked,
    quizId: quiz.id,
    userId,
    onLeave: (count) => {
      setWarnings(count)
      if (count >= MAX_LEAVES) {
        setBlocked(true)
        toast.error('🚫 ถูกล็อคเนื่องจากออกจากหน้าแบบทดสอบเกินกำหนด', { duration: 0 })
      } else {
        toast.error(`⚠️ ออกจากหน้าแบบทดสอบ! (ครั้งที่ ${count}/${MAX_LEAVES})${quiz.time_limit ? ` หักเวลา ${PENALTY_SECONDS} วินาที` : ''}`, { duration: 5000 })
        if (quiz.time_limit) timer.deduct(PENALTY_SECONDS)
      }
    },
  })

  async function doSubmit() {
    if (submitting) return
    setSubmitting(true); timer.stop()
    let correct = 0, scoreable = 0
    questions.forEach(q => {
      if (q.type === 'mcq') { scoreable++; if (String(answers[q.id]) === String(q.correct_answer)) correct++ }
      else if (q.type === 'fill') { scoreable++; if (String(answers[q.id] ?? '').trim().toLowerCase() === (q.correct_answer ?? '').trim().toLowerCase()) correct++ }
    })
    const score = scoreable > 0 ? (correct / scoreable) * 100 : null
    const is_passed = score !== null ? score >= quiz.pass_score : null
    const time_taken = Math.floor((Date.now() - startRef.current) / 1000)
    await supabase.from('quiz_sessions').update({ status: 'submitted' }).eq('student_id', userId).eq('quiz_id', quiz.id)
    const { error } = await supabase.from('submissions').upsert(
      { quiz_id: quiz.id, student_id: userId, answers, score, is_passed, time_taken, submitted_at: new Date().toISOString() },
      { onConflict: 'quiz_id,student_id' }
    )
    if (error) { toast.error('ส่งไม่สำเร็จ กรุณาลองใหม่'); setSubmitting(false); return }
    router.push(`/dashboard/quizzes/${quiz.id}/result`)
  }

  function confirmLeave() {
    if (confirm('⚠️ ออกจากแบบทดสอบ? คำตอบจะไม่ถูกบันทึก')) {
      timer.stop()
      supabase.from('quiz_sessions').update({ status: 'left' }).eq('student_id', userId).eq('quiz_id', quiz.id)
      router.push('/dashboard/quizzes')
    }
  }

  const answered = Object.keys(answers).length
  const remaining = MAX_LEAVES - warnings
  const currentQ = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  // ── Blocked ──
  if (blocked) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <div className="card" style={{ padding: 40, border: '2px solid var(--red)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>ถูกล็อคการทำข้อสอบ</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>
            ออกจากหน้าแบบทดสอบเกิน {MAX_LEAVES} ครั้ง<br />กรุณาติดต่อครูผู้สอนเพื่อขออนุญาตทำซ้ำ
          </p>
          <button className="btn" style={{ color: 'var(--red)' }} onClick={() => router.push('/dashboard/quizzes')}>กลับหน้าหลัก</button>
        </div>
      </div>
    )
  }

  // ── No questions ──
  if (questions.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <div className="card" style={{ padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ยังไม่มีข้อสอบ</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>แบบทดสอบนี้ยังไม่มีข้อสอบ กรุณาติดต่อครูผู้สอน</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/dashboard/quizzes')}>กลับ</button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // Progress dots — shared between desktop & mobile
  // ─────────────────────────────────────────────────────────────────
  const ProgressDots = () => (
    <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Question Progress</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{answered}/{questions.length} ตอบแล้ว</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined
          const isCurrent = i === currentIndex
          return (
            <button key={q.id} onClick={() => setCurrentIndex(i)} style={{
              width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
              transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
              background: isCurrent ? '#2563eb' : isAnswered ? 'rgba(5,150,105,0.1)' : 'var(--surface)',
              color: isCurrent ? 'white' : isAnswered ? '#059669' : 'var(--text-3)',
              border: isCurrent ? '2px solid #2563eb' : isAnswered ? '2px solid rgba(5,150,105,0.45)' : '1.5px solid var(--border)',
              boxShadow: isCurrent ? '0 4px 12px rgba(37,99,235,0.28)' : isAnswered ? '0 2px 6px rgba(5,150,105,0.12)' : 'none',
            }}>
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )

  // MCQ options — shared renderer
  const MCQOptions = ({ q }: { q: Question }) => {
    const opts = q.options as { label: string; text: string }[]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map((opt, oi) => {
          const selected = answers[q.id] === oi
          const c = OPT_COLORS[oi % OPT_COLORS.length]
          return (
            <button key={oi} onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit', width: '100%',
              background: selected ? c.bg : 'var(--surface)',
              border: `2px solid ${selected ? c.border : 'var(--border)'}`,
              boxShadow: selected ? `0 5px 18px ${c.border}22` : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.15s',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: selected ? c.labelBg : '#f1f5f9',
                color: selected ? 'white' : 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
                boxShadow: selected ? `0 3px 10px ${c.border}44` : 'none',
              }}>
                {LABELS[oi] ?? opt.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? c.text : 'var(--text)', flex: 1, lineHeight: 1.4 }}>
                {opt.text}
              </span>
              {selected && <CheckCircle2 size={18} color={c.border} style={{ flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* Sticky header */
        .qa-header {
          position: sticky; top: 0; z-index: 20; background: var(--bg); padding-bottom: 4px;
        }
        /* Desktop: show full top-bar card, hide mobile pills */
        .qa-mobile-meta { display: none; }
        .qa-desktop-wrap { display: flex; flex-direction: column; gap: 16px; max-width: 900px; margin: 0 auto; }
        /* Desktop grid: question left (7) + options right (5) */
        .qa-grid { display: grid; grid-template-columns: 7fr 5fr; gap: 14px; }
        /* Desktop nav: inline at bottom */
        .qa-nav-inline { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; gap: 10px; }
        .qa-nav-fixed { display: none; }

        @media (max-width: 767px) {
          /* Hide desktop top-bar card on mobile */
          .qa-desktop-topbar { display: none !important; }
          /* Show mobile pills */
          .qa-mobile-meta { display: flex; }
          /* Mobile: single column layout, padded, with bottom fixed bar */
          .qa-desktop-wrap { max-width: 100%; padding: 0 16px; padding-bottom: 100px; gap: 16px; }
          /* Single column — no asymmetric grid */
          .qa-grid { grid-template-columns: 1fr; }
          /* Hide inline nav, show fixed bottom bar */
          .qa-nav-inline { display: none; }
          .qa-nav-fixed { display: block; }
          /* Question text bigger on mobile */
          .qa-question-text { font-size: 22px !important; text-align: center; }
          /* Question canvas: less padding */
          .qa-q-canvas { padding: 24px 20px !important; min-height: unset !important; }
        }
      `}</style>

      {/* ══ STICKY HEADER ══════════════════════════════════════════ */}
      <div className="qa-header">

        {/* Desktop top-bar */}
        <div className="qa-desktop-topbar">
          <div className="card" style={{ padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 15 }}>{quiz.title}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>ตอบแล้ว {answered}/{questions.length} ข้อ</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                  background: warnings >= 2 ? 'var(--red-light)' : warnings >= 1 ? 'var(--amber-light)' : 'var(--green-light)',
                  color: warnings >= 2 ? 'var(--red)' : warnings >= 1 ? 'var(--amber)' : 'var(--green)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <AlertTriangle size={11} />
                  ออกแล้ว {warnings}/{MAX_LEAVES}
                </div>
                {quiz.time_limit && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 'var(--r-md)',
                    background: timer.isDanger ? 'var(--red-light)' : timer.isWarning ? 'var(--amber-light)' : 'var(--blue-light)',
                    border: `1px solid ${timer.isDanger ? 'rgba(220,38,38,0.2)' : timer.isWarning ? 'rgba(217,119,6,0.2)' : 'rgba(37,99,235,0.2)'}`,
                  }}>
                    <Clock size={14} color={timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--blue)'} />
                    <span style={{ fontSize: 20, fontWeight: 800, color: timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--blue)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                      {timer.display}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="progress" style={{ marginTop: 8, height: 4 }}>
              <div className="progress-fill" style={{ width: `${(answered / questions.length) * 100}%`, background: 'var(--blue)', transition: 'width 0.4s ease' }} />
            </div>
            {quiz.time_limit && (
              <div className="progress" style={{ marginTop: 3, height: 3 }}>
                <div className="progress-fill" style={{ width: `${timer.percent}%`, background: timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--green)', transition: 'width 1s linear, background 0.5s' }} />
              </div>
            )}
          </div>
        </div>

        {/* Mobile top-bar */}
        <div style={{ display: 'none' }} className="qa-desktop-topbar-mobile">
          {/* thin progress line under header — injected via CSS on mobile */}
        </div>

        {/* Mobile: thin glowing progress bar */}
        <div style={{ height: 3, background: 'var(--border)' }} className="qa-mobile-meta" /* reuse class just for display toggle */>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease', boxShadow: '0 0 8px rgba(37,99,235,0.4)' }} />
        </div>

        {/* Warning banner */}
        {warnings > 0 && warnings < MAX_LEAVES && (
          <div className="alert alert-danger" style={{ margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} />
            <span style={{ fontSize: 12 }}>คำเตือน: ออกจากหน้าแล้ว {warnings}/{MAX_LEAVES} — เหลืออีก {remaining} ครั้งก่อนถูกล็อค</span>
          </div>
        )}
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <div className="qa-desktop-wrap">

        {/* Mobile meta pills */}
        <div className="qa-mobile-meta" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 700, color: '#2563eb', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Clock size={12} />
            {quiz.time_limit ? `${timer.display} LEFT` : 'ไม่จำกัดเวลา'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 99, background: warnings >= 2 ? 'var(--red-light)' : warnings >= 1 ? 'var(--amber-light)' : 'transparent', border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: warnings >= 2 ? 'var(--red)' : warnings >= 1 ? 'var(--amber)' : 'var(--text-3)' }}>
            <AlertTriangle size={11} />
            ออกแล้ว {warnings}/{MAX_LEAVES}
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Q {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {/* Progress dots */}
        <ProgressDots />

        {/* ── Question area ── */}
        {currentQ && (
          <>
            {currentQ.type === 'mcq' && currentQ.options ? (
              /* Desktop: asymmetric 7/5, Mobile: stacked (via .qa-grid) */
              <div className="qa-grid fade-up">
                {/* Left: question canvas */}
                <div className="card qa-q-canvas" style={{ padding: '30px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                      Q{currentIndex + 1}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Multiple Choice</span>
                  </div>
                  <p className="qa-question-text" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.7 }}>
                    {currentQ.question_text}
                  </p>
                </div>
                {/* Right: options */}
                <MCQOptions q={currentQ} />
              </div>
            ) : (
              /* Fill / Essay: full width card */
              <div className="card fade-up" style={{ padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                    background: currentQ.type === 'fill' ? 'var(--green-light)' : 'var(--amber-light)',
                    color: currentQ.type === 'fill' ? 'var(--green)' : 'var(--amber)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>Q{currentIndex + 1}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {currentQ.type === 'fill' ? 'Fill in the Blank' : 'Essay'}
                  </span>
                </div>
                <p className="qa-question-text" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.7, marginBottom: 20 }}>
                  {currentQ.question_text}
                </p>
                {currentQ.type === 'fill' ? (
                  <input className="input" placeholder="พิมพ์คำตอบ..." value={String(answers[currentQ.id] ?? '')} onChange={e => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))} style={{ fontSize: 15 }} />
                ) : (
                  <textarea className="input" rows={5} placeholder="เขียนคำตอบ..." value={String(answers[currentQ.id] ?? '')} onChange={e => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))} style={{ resize: 'vertical', fontSize: 14 }} />
                )}
              </div>
            )}
          </>
        )}

        {/* ══ DESKTOP INLINE NAV ════════════════════════════════════ */}
        <div className="qa-nav-inline">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ color: 'var(--red)', gap: 6 }} onClick={confirmLeave}>
              <LogOut size={13} /> ออก
            </button>
            <button className="btn" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} style={{ gap: 6 }}>
              <ArrowLeft size={14} /> ข้อก่อนหน้า
            </button>
          </div>
          {isLast ? (
            <button className="btn btn-primary" onClick={doSubmit} disabled={submitting} style={{ gap: 8 }}>
              {submitting ? <><div className="spinner" />กำลังส่ง...</> : <><Send size={14} />ส่งแบบทดสอบ ({answered}/{questions.length} ข้อ)</>}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} style={{ gap: 6 }}>
              ข้อถัดไป <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ══ MOBILE FIXED BOTTOM BAR ═══════════════════════════════ */}
      <div className="qa-nav-fixed">
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: 'rgba(249,249,255,0.93)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)',
          padding: '12px 20px 24px', boxShadow: '0 -8px 30px rgba(20,27,43,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 99,
              background: 'transparent', border: 'none', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              color: currentIndex === 0 ? 'var(--text-3)' : '#2563eb',
              fontWeight: 700, fontSize: 14, fontFamily: 'inherit', opacity: currentIndex === 0 ? 0.4 : 1,
            }}>
              <ArrowLeft size={16} /> Previous
            </button>
            {isLast ? (
              <button onClick={doSubmit} disabled={submitting} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 99,
                background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: 'white',
                fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
              }}>
                {submitting ? <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />ส่ง...</> : <><Send size={14} />ส่ง ({answered}/{questions.length})</>}
              </button>
            ) : (
              <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 99,
                background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: 'white',
                fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
              }}>
                Next <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
