'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTimer } from '@/hooks/useTimer'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import type { Quiz, Question } from '@/types/quiz'
import { AlertTriangle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function QuizAttemptClient({ quiz, questions, userId }: { quiz: Quiz; questions: Question[]; userId: string }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [warnings, setWarnings] = useState(0)
  const startRef = useRef(Date.now())
  const supabase = createClient()

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
    enabled: !submitting,
    onLeave: () => {
      setWarnings(w => w + 1)
      toast.error('⚠️ ตรวจพบว่าออกจากหน้าแบบทดสอบ! กรุณากลับมาทำต่อ', { duration: 5000 })
    },
  })

  async function doSubmit() {
    if (submitting) return
    setSubmitting(true)
    timer.stop()

    let correct = 0, scoreable = 0
    questions.forEach(q => {
      if (q.type === 'mcq') {
        scoreable++
        if (String(answers[q.id]) === String(q.correct_answer)) correct++
      } else if (q.type === 'fill') {
        scoreable++
        if ((String(answers[q.id] ?? '')).trim().toLowerCase() === (q.correct_answer ?? '').trim().toLowerCase()) correct++
      }
    })

    const score = scoreable > 0 ? (correct / scoreable) * 100 : null
    const is_passed = score !== null ? score >= quiz.pass_score : null
    const time_taken = Math.floor((Date.now() - startRef.current) / 1000)

    const { error } = await supabase.from('submissions').insert({ quiz_id: quiz.id, student_id: userId, answers, score, is_passed, time_taken })
    if (error) { toast.error('ส่งไม่สำเร็จ กรุณาลองใหม่'); setSubmitting(false); return }
    router.push(`/dashboard/quizzes/${quiz.id}/result`)
  }

  function confirmLeave() {
    if (confirm('⚠️ ออกจากแบบทดสอบ? คำตอบจะไม่ถูกบันทึก')) {
      timer.stop()
      router.push('/dashboard/quizzes')
    }
  }

  const answered = Object.keys(answers).length
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Sticky header with timer */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', paddingBottom: 12, marginBottom: 8 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 15 }}>{quiz.title}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                ตอบแล้ว {answered}/{questions.length} ข้อ
              </p>
            </div>

            {/* Timer */}
            {quiz.time_limit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 'var(--r-md)', background: timer.isDanger ? 'var(--red-light)' : timer.isWarning ? 'var(--amber-light)' : 'var(--blue-light)', border: `1px solid ${timer.isDanger ? 'rgba(220,38,38,0.2)' : timer.isWarning ? 'rgba(217,119,6,0.2)' : 'rgba(37,99,235,0.2)'}` }}>
                <Clock size={16} color={timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--blue)'} />
                <span className={`timer-display ${timer.isDanger ? 'timer-danger' : timer.isWarning ? 'timer-warning' : ''}`}
                  style={{ fontSize: 22, fontWeight: 700, color: timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--blue)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {timer.display}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="progress" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--blue)' }} />
          </div>

          {/* Timer progress */}
          {quiz.time_limit && (
            <div className="progress" style={{ marginTop: 4, height: 3 }}>
              <div className="progress-fill" style={{ width: `${timer.percent}%`, background: timer.isDanger ? 'var(--red)' : timer.isWarning ? 'var(--amber)' : 'var(--green)', transition: 'width 1s linear, background 0.5s' }} />
            </div>
          )}
        </div>

        {/* Leave warning */}
        {warnings > 0 && (
          <div className="alert alert-danger" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} />
            <span>คำเตือน: ออกจากหน้าแบบทดสอบแล้ว {warnings} ครั้ง</span>
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} className="card fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: answers[q.id] !== undefined ? 'var(--blue)' : 'var(--blue-light)', color: answers[q.id] !== undefined ? 'white' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, paddingTop: 3 }}>{q.question_text}</p>
            </div>

            {/* MCQ */}
            {q.type === 'mcq' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 40 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi
                  return (
                    <button key={oi} onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-md)', border: `1.5px solid ${selected ? 'var(--blue)' : 'var(--border)'}`, background: selected ? 'var(--blue-light)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit', fontSize: 13, fontWeight: selected ? 500 : 400, color: selected ? 'var(--blue)' : 'var(--text)' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--blue)' : 'var(--border-md)'}`, background: selected ? 'var(--blue)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: selected ? 'white' : 'var(--text-3)', flexShrink: 0 }}>
                        {opt.label}
                      </span>
                      {opt.text}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Fill */}
            {q.type === 'fill' && (
              <div style={{ paddingLeft: 40 }}>
                <input className="input" placeholder="พิมพ์คำตอบ..." value={String(answers[q.id] ?? '')} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} />
              </div>
            )}

            {/* Essay */}
            {q.type === 'essay' && (
              <div style={{ paddingLeft: 40 }}>
                <textarea className="input" rows={4} placeholder="เขียนคำตอบ..." value={String(answers[q.id] ?? '')} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingBottom: 16 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={confirmLeave}>
          ออกจากแบบทดสอบ
        </button>
        <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={doSubmit} disabled={submitting}>
          {submitting ? <><div className="spinner" />กำลังส่ง...</> : `ส่งแบบทดสอบ (${answered}/${questions.length} ข้อ)`}
        </button>
      </div>
    </div>
  )
}
