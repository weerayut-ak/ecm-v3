'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, RotateCcw, X, Save } from 'lucide-react'

const LABELS = ['A', 'B', 'C', 'D', 'E']

interface OMRExam {
  id: string
  title: string
  num_questions: number
  options_per_q: number
  pass_score: number
  answer_keys: { questionNum: number; correctOption: number }[]
}

interface ScanResultInput {
  examId: string
  studentName: string
  studentCode: string
  grade: string
  answers: Record<number, number>
  scannedAt: string
}

interface Props {
  exam: OMRExam
  scanResult: ScanResultInput
  onRescan: () => void
  onClose: () => void
}

/* ── Score calculator ───────────────────────────────────────────── */
function calcScore(answers: Record<number, number>, keys: OMRExam['answer_keys'], numQ: number) {
  let correct = 0, wrong = 0, blank = 0
  for (let i = 1; i <= numQ; i++) {
    const ans = answers[i]
    const key = keys.find(k => k.questionNum === i)
    if (ans === undefined || ans < 0) { blank++; continue }
    if (key && ans === key.correctOption) correct++
    else wrong++
  }
  const score = numQ > 0 ? Math.round((correct / numQ) * 100) : 0
  return { correct, wrong, blank, score }
}

/* ── Score Ring ─────────────────────────────────────────────────── */
function ScoreRing({ score, pass }: { score: number; pass: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const isPassed = score >= pass
  const color = isPassed ? '#059669' : '#dc2626'
  return (
    <svg width={120} height={120} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={60} cy={60} r={r} fill="none" stroke="var(--surface-highest)" strokeWidth={9} />
      <circle cx={60} cy={60} r={r} fill="none" stroke={color}
        strokeWidth={9} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={60} y={52} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fill: color, fontSize: 22, fontWeight: 900 }}>
        {score}%
      </text>
      <text x={60} y={72} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fill: 'var(--text-3)', fontSize: 10, fontWeight: 700 }}>
        {isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
      </text>
    </svg>
  )
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function OMRResultClient({ exam, scanResult, onRescan, onClose }: Props) {
  const supabase = createClient()

  const [studentName, setStudentName] = useState(scanResult.studentName)
  const [studentCode, setStudentCode] = useState(scanResult.studentCode)
  const [grade, setGrade]             = useState(scanResult.grade)
  const [answers, setAnswers]         = useState<Record<number, number>>(scanResult.answers)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const { correct, wrong, blank, score } = calcScore(answers, exam.answer_keys, exam.num_questions)
  const isPassed = score >= exam.pass_score

  function setAnswer(qNum: number, opt: number) {
    setAnswers(p => ({ ...p, [qNum]: opt }))
    setSaved(false)
  }
  function clearAnswer(qNum: number) {
    setAnswers(p => { const n = { ...p }; delete n[qNum]; return n })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      exam_id:      exam.id,
      student_name: studentName.trim() || null,
      student_code: studentCode.trim() || null,
      grade:        grade.trim() || null,
      answers,
      score,
      correct,
      wrong,
      blank,
      is_passed: isPassed,
      scanned_at: scanResult.scannedAt,
    }
    const { error } = await supabase.from('omr_results').insert(payload)
    setSaving(false)
    if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return }
    toast.success('บันทึกผลสำเร็จ ✓')
    setSaved(true)
  }

  return (
    <div style={{ fontFamily: 'var(--font)', minHeight: '100vh', background: 'var(--surface-low)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button className="btn btn-icon btn-ghost" onClick={onClose} title="ปิด"><X size={16} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', lineHeight: 1 }}>ผลการตรวจ OMR</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</p>
        </div>
        <button className="btn" onClick={onRescan} style={{ gap: 6 }}>
          <RotateCcw size={13} /> สแกนใหม่
        </button>
        <button
          className={`btn ${saved ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saving || saved}
          style={{ gap: 6 }}
        >
          {saving
            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />บันทึก...</>
            : saved
            ? '✓ บันทึกแล้ว'
            : <><Save size={13} /> บันทึกผล</>}
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Score summary ── */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)',
          padding: '24px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <ScoreRing score={score} pass={exam.pass_score} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {isPassed
                ? <CheckCircle2 size={20} color="#059669" />
                : <XCircle size={20} color="#dc2626" />}
              <span style={{ fontSize: 18, fontWeight: 900, color: isPassed ? '#059669' : '#dc2626' }}>
                {isPassed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>(เกณฑ์ {exam.pass_score}%)</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'ถูก',        value: correct, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                { label: 'ผิด',        value: wrong,   color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
                { label: 'ไม่ตอบ',    value: blank,   color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
                { label: 'ทั้งหมด',   value: exam.num_questions, color: 'var(--primary)', bg: 'rgba(0,80,203,0.06)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '6px 14px', borderRadius: 999, background: s.bg, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, color: s.color, fontSize: 16 }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Student info ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>ข้อมูลนักเรียน</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'ชื่อ-นามสกุล', value: studentName, set: setStudentName, placeholder: 'ชื่อนักเรียน' },
              { label: 'รหัสนักเรียน', value: studentCode, set: setStudentCode, placeholder: 'รหัส' },
              { label: 'ชั้น/ห้อง',    value: grade,        set: setGrade,        placeholder: 'ม.2/1' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  className="input"
                  value={f.value}
                  onChange={e => { f.set(e.target.value); setSaved(false) }}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Answer review ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              ตรวจสอบและแก้ไขคำตอบ
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>คลิกเปลี่ยนคำตอบได้</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {Array.from({ length: exam.num_questions }, (_, i) => {
              const qNum     = i + 1
              const key      = exam.answer_keys.find(k => k.questionNum === qNum)
              const studentAns = answers[qNum]
              const isBlank  = studentAns === undefined || studentAns < 0
              const isCorrect = !isBlank && key !== undefined && studentAns === key.correctOption
              const optCount  = exam.options_per_q

              let rowBg = 'var(--surface-lowest)', rowBorder = 'var(--border)'
              if (!isBlank) {
                rowBg     = isCorrect ? 'rgba(5,150,105,0.05)' : 'rgba(220,38,38,0.04)'
                rowBorder = isCorrect ? 'rgba(5,150,105,0.3)'  : 'rgba(220,38,38,0.25)'
              }

              return (
                <div key={qNum} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-xl)',
                  border: `1.5px solid ${rowBorder}`, background: rowBg,
                }}>
                  {/* Q number */}
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: isBlank ? 'var(--surface-highest)' : isCorrect ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.12)',
                    color: isBlank ? 'var(--text-3)' : isCorrect ? '#059669' : '#dc2626',
                  }}>{qNum}</span>

                  {/* Answer bubbles */}
                  <div style={{ display: 'flex', gap: 5, flex: 1 }}>
                    {Array.from({ length: optCount }, (_, oi) => {
                      const isSelected = studentAns === oi
                      const isAnswer   = key?.correctOption === oi
                      let bg = 'var(--surface)', border = 'var(--border)', color = 'var(--text-3)'
                      if (isSelected && isAnswer)  { bg = '#059669'; border = '#059669'; color = 'white' }
                      else if (isSelected)          { bg = '#dc2626'; border = '#dc2626'; color = 'white' }
                      else if (isAnswer && !isBlank){ border = '#059669'; color = '#059669' }
                      return (
                        <button key={oi} onClick={() => isSelected ? clearAnswer(qNum) : setAnswer(qNum, oi)} style={{
                          width: 26, height: 26, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                          border: `2px solid ${border}`, background: bg, color,
                          cursor: 'pointer', transition: 'all 0.12s', flexShrink: 0,
                        }}>
                          {LABELS[oi]}
                        </button>
                      )
                    })}
                  </div>

                  {/* Result icon */}
                  <span style={{ fontSize: 14, flexShrink: 0 }}>
                    {isBlank ? '—' : isCorrect ? '✓' : `✗`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Save button (bottom) ── */}
        {!saved && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ alignSelf: 'flex-end', gap: 8, padding: '12px 28px', fontSize: 14 }}
          >
            {saving
              ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />กำลังบันทึก...</>
              : <><Save size={15} /> บันทึกผลการสอบ</>}
          </button>
        )}
        {saved && (
          <div style={{
            alignSelf: 'flex-end', padding: '12px 28px', borderRadius: 'var(--r-full)',
            background: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 700, fontSize: 14,
          }}>
            ✓ บันทึกแล้ว
          </div>
        )}
      </div>
    </div>
  )
}