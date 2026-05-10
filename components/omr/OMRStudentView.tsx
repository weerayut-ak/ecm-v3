'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

const LABELS = ['A', 'B', 'C', 'D', 'E']

interface OMRResult {
  id: string
  exam_id: string
  student_name: string
  student_code: string
  grade: string
  answers: Record<number, number>
  score: number
  correct: number
  wrong: number
  blank: number
  is_passed: boolean
  scanned_at: string
  exam?: { title: string; num_questions: number; pass_score: number; answer_keys: { questionNum: number; correctOption: number }[] }
}

const CSS = `
  .omr-sv { max-width: 700px; margin: 0 auto; }
  .omr-result-card {
    background: var(--surface-lowest);
    border-radius: var(--r-2xl);
    border: 1px solid var(--border);
    overflow: hidden;
    margin-bottom: 16px;
    transition: box-shadow 0.2s;
  }
  .omr-result-card:hover { box-shadow: var(--shadow-md); }
  .omr-answer-mini {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 5px;
    padding: 12px 18px 16px;
  }
  @media (max-width: 480px) {
    .omr-answer-mini { grid-template-columns: repeat(6, 1fr); }
  }
`

function ScoreRing({ score, pass }: { score: number; pass: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const isPassed = score >= pass
  const color = isPassed ? '#059669' : '#dc2626'

  return (
    <svg width={88} height={88} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--surface-highest)" strokeWidth={7} />
      <circle cx={44} cy={44} r={r} fill="none" stroke={color}
        strokeWidth={7} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={44} y={44} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: '44px 44px', fill: color, fontSize: 14, fontWeight: 900 }}>
        {score}%
      </text>
    </svg>
  )
}

function ResultCard({ result }: { result: OMRResult }) {
  const [open, setOpen] = useState(false)
  const exam = result.exam
  const isPassed = result.is_passed

  return (
    <div className="omr-result-card">
      {/* Header */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <ScoreRing score={result.score} pass={exam?.pass_score ?? 60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exam?.title ?? 'ข้อสอบ OMR'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isPassed
                ? <CheckCircle2 size={13} color="#059669" />
                : <XCircle size={13} color="#dc2626" />}
              <span style={{ fontWeight: 700, color: isPassed ? '#059669' : '#dc2626' }}>
                {isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
              </span>
              <span style={{ color: 'var(--text-3)' }}>(เกณฑ์ {exam?.pass_score}%)</span>
            </span>
            <span>✓ {result.correct}  ✗ {result.wrong}  — {result.blank}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {new Date(result.scanned_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-3)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</div>
      </div>

      {/* Expanded answer review */}
      {open && exam && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '12px 18px 6px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'ถูก',  value: result.correct, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
              { label: 'ผิด',  value: result.wrong,   color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
              { label: 'ว่าง', value: result.blank,   color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: s.bg }}>
                <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="omr-answer-mini">
            {exam.answer_keys.sort((a, b) => a.questionNum - b.questionNum).map(key => {
              const studentAns = result.answers[key.questionNum]
              const isBlank   = studentAns === undefined || studentAns < 0
              const isCorrect = !isBlank && studentAns === key.correctOption
              let bg = 'rgba(156,163,175,0.08)', color = '#9ca3af', border = 'rgba(156,163,175,0.2)'
              if (!isBlank) {
                bg     = isCorrect ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.06)'
                color  = isCorrect ? '#059669' : '#dc2626'
                border = isCorrect ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.25)'
              }
              return (
                <div key={key.questionNum} style={{ borderRadius: 8, border: `1.5px solid ${border}`, background: bg, padding: '5px 3px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'var(--text-3)', fontWeight: 700 }}>{key.questionNum}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color }}>{isBlank ? '—' : LABELS[studentAns]}</div>
                  {!isCorrect && !isBlank && (
                    <div style={{ fontSize: 8, color: '#6b7280' }}>{LABELS[key.correctOption]}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OMRStudentView({ studentCode }: { studentCode?: string }) {
  const supabase = createClient()
  const [results, setResults] = useState<OMRResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('omr_results')
        .select('*, exam:omr_exams(title, num_questions, pass_score, answer_keys)')
        .order('scanned_at', { ascending: false })

      if (studentCode) query = query.eq('student_code', studentCode)

      const { data } = await query
      setResults((data ?? []) as OMRResult[])
      setLoading(false)
    }
    load()
  }, [studentCode])

  return (
    <div className="omr-sv">
      <style>{CSS}</style>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 4 }}>OMR RESULTS</p>
        <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>ผลการสอบ</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28, borderWidth: 3 }} />
          <p>กำลังโหลด...</p>
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>ยังไม่มีผลการสอบ</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>ผลจะปรากฏหลังครูสแกนกระดาษคำตอบของคุณ</p>
        </div>
      ) : (
        results.map(r => <ResultCard key={r.id} result={r} />)
      )}
    </div>
  )
}