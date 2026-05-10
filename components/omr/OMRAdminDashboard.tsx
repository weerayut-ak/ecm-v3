'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Trash2, Download, ChevronDown, ChevronUp, Eye, Scan, FileText } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import OMRScanner from './OMRScanner'
import OMRSheetGenerator from './OMRSheetGenerator'
import OMRResultClient from './OMRResultClient'

const LABELS = ['A', 'B', 'C', 'D', 'E']

interface OMRExam {
  id: string
  title: string
  description: string | null
  num_questions: number
  options_per_q: number
  pass_score: number
  answer_keys: { questionNum: number; correctOption: number }[]
  created_at: string
}

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
}

const CSS = `
  .omr-admin { max-width: 1000px; margin: 0 auto; font-family: var(--font); }
  .omr-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border); margin-bottom: 20px; }
  .omr-tab { padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; background: none; font-family: var(--font); color: var(--text-3); border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
  .omr-tab:hover  { color: var(--text); }
  .omr-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
  .omr-exam-card { background: var(--surface-lowest); border-radius: var(--r-2xl); border: 1px solid var(--border); margin-bottom: 14px; overflow: hidden; transition: box-shadow 0.2s; }
  .omr-exam-card:hover { box-shadow: var(--shadow-md); }
  .omr-exam-header { display: flex; align-items: center; gap: 12px; padding: 16px 18px; cursor: pointer; }
  .omr-key-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 6px; padding: 12px 18px 16px; background: var(--surface-low); }
  .omr-key-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .omr-key-num  { font-size: 9px; font-weight: 700; color: var(--text-3); }
  .omr-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .omr-results-table th { padding: 9px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); background: var(--surface-low); border-bottom: 1.5px solid var(--border); text-align: left; white-space: nowrap; }
  .omr-results-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-highest); }
  .omr-results-table tbody tr:hover td { background: var(--surface-low); }
  @media (max-width: 600px) {
    .omr-key-grid { grid-template-columns: repeat(5, 1fr); }
    .omr-hide-sm { display: none; }
  }
`

/* ── Answer Key Editor ─────────────────────────────────────────── */
function AnswerKeyEditor({
  numQ, optPerQ, keys, onChange
}: {
  numQ: number
  optPerQ: number
  keys: { questionNum: number; correctOption: number }[]
  onChange: (keys: { questionNum: number; correctOption: number }[]) => void
}) {
  function setKey(qNum: number, opt: number) {
    const next = keys.filter(k => k.questionNum !== qNum)
    next.push({ questionNum: qNum, correctOption: opt })
    next.sort((a, b) => a.questionNum - b.questionNum)
    onChange(next)
  }
  function getKey(qNum: number) {
    return keys.find(k => k.questionNum === qNum)?.correctOption ?? -1
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px,1fr))', gap: 6 }}>
      {Array.from({ length: numQ }, (_, i) => {
        const q = i + 1
        const sel = getKey(q)
        return (
          <div key={q} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>ข้อ {q}</div>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {Array.from({ length: optPerQ }, (_, oi) => (
                <button key={oi} onClick={() => setKey(q, oi)} style={{
                  width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 800,
                  border: `1.5px solid ${sel === oi ? 'var(--primary)' : 'var(--border)'}`,
                  background: sel === oi ? 'var(--primary)' : 'var(--surface)',
                  color: sel === oi ? 'white' : 'var(--text-3)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {LABELS[oi]}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Create Exam Modal ─────────────────────────────────────────── */
function CreateExamModal({
  onClose, onCreated
}: {
  onClose: () => void
  onCreated: (exam: OMRExam) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ title: '', description: '', num_questions: 30, options_per_q: 4, pass_score: 60 })
  const [keys, setKeys] = useState<{ questionNum: number; correctOption: number }[]>([])
  const [step, setStep] = useState<'info' | 'keys'>('info')
  const [saving, setSaving] = useState(false)

  const unset = form.num_questions - keys.length

  async function save() {
    if (!form.title.trim()) { toast.error('กรุณาใส่ชื่อข้อสอบ'); return }
    if (keys.length < form.num_questions) {
      if (!confirm(`ยังไม่ได้ตั้งเฉลย ${unset} ข้อ — บันทึกต่อไหม?`)) return
    }
    setSaving(true)
    const { data, error } = await supabase.from('omr_exams').insert({ ...form, answer_keys: keys }).select().single()
    setSaving(false)
    if (error || !data) { toast.error('สร้างไม่สำเร็จ: ' + error?.message); return }
    toast.success('สร้างข้อสอบ OMR แล้ว ✓')
    onCreated(data as OMRExam)
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'keys' ? 700 : 460 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 800, fontSize: 16 }}>
            {step === 'info' ? '📝 สร้างข้อสอบ OMR ใหม่' : '✏️ ตั้งเฉลย'}
          </h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {step === 'info' ? (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">ชื่อข้อสอบ *</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="เช่น สอบกลางภาค ม.2" />
            </div>
            <div>
              <label className="form-label">คำอธิบาย</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">จำนวนข้อ</label>
                <input className="input" type="number" min={1} max={100} value={form.num_questions} onChange={e => setForm(p => ({ ...p, num_questions: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="form-label">ตัวเลือก/ข้อ</label>
                <select className="input" value={form.options_per_q} onChange={e => setForm(p => ({ ...p, options_per_q: Number(e.target.value) }))}>
                  {[2,3,4,5].map(n => <option key={n} value={n}>{n} (A-{LABELS[n-1]})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">คะแนนผ่าน (%)</label>
                <input className="input" type="number" min={1} max={100} value={form.pass_score} onChange={e => setForm(p => ({ ...p, pass_score: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
              ตั้งเฉลยทั้ง {form.num_questions} ข้อ &nbsp;·&nbsp;
              <span style={{ color: unset > 0 ? '#d97706' : '#059669', fontWeight: 700 }}>
                {unset > 0 ? `ยังไม่ได้ตั้ง ${unset} ข้อ` : '✓ ครบทุกข้อ'}
              </span>
            </p>
            <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
              <AnswerKeyEditor numQ={form.num_questions} optPerQ={form.options_per_q} keys={keys} onChange={setKeys} />
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {step === 'info' ? (
            <>
              <button className="btn" onClick={onClose}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={() => setStep('keys')} disabled={!form.title.trim()}>
                ถัดไป: ตั้งเฉลย →
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setStep('info')}>← ย้อนกลับ</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner" />บันทึก...</> : '✓ สร้างข้อสอบ'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Results Table ─────────────────────────────────────────────── */
function ResultsTable({ results, exam }: { results: OMRResult[]; exam: OMRExam }) {
  function exportAll() {
    if (!results.length) { toast.error('ยังไม่มีผลลัพธ์'); return }
    const headers = ['ชื่อ', 'รหัส', 'ชั้น', 'คะแนน(%)', 'ถูก', 'ผิด', 'ว่าง', 'ผล',
      ...Array.from({ length: exam.num_questions }, (_, i) => `ข้อ${i+1}`),
      ...Array.from({ length: exam.num_questions }, (_, i) => `เฉลย${i+1}`),
    ]
    const rows = results.map(r => [
      r.student_name, r.student_code, r.grade,
      r.score, r.correct, r.wrong, r.blank, r.is_passed ? 'ผ่าน' : 'ไม่ผ่าน',
      ...Array.from({ length: exam.num_questions }, (_, i) => LABELS[r.answers[i+1] ?? -1] ?? '-'),
      ...exam.answer_keys.map(k => LABELS[k.correctOption]),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `omr-results-${exam.title.replace(/\s+/g,'-')}.csv`
    a.click()
  }

  const avg = results.length ? Math.round(results.reduce((s,r) => s + r.score, 0) / results.length) : 0
  const passed = results.filter(r => r.is_passed).length

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'สแกนแล้ว', value: results.length, color: 'var(--primary)' },
            { label: 'ผ่าน', value: passed, color: '#059669' },
            { label: 'ไม่ผ่าน', value: results.length - passed, color: '#dc2626' },
            { label: 'คะแนนเฉลี่ย', value: `${avg}%`, color: 'var(--text-2)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 14px', borderRadius: 'var(--r-full)', background: 'var(--surface-highest)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: s.color, fontSize: 14 }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <button onClick={exportAll} className="btn" style={{ gap: 6, flexShrink: 0 }}>
          <Download size={13} /> Export Excel
        </button>
      </div>

      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <p style={{ fontSize: 14 }}>ยังไม่มีผลการสแกน</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
          <table className="omr-results-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>รหัส</th>
                <th className="omr-hide-sm">ชั้น</th>
                <th>คะแนน</th>
                <th>ถูก/ผิด/ว่าง</th>
                <th>ผล</th>
                <th className="omr-hide-sm">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.student_name || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-3)' }}>{r.student_code || '—'}</td>
                  <td className="omr-hide-sm" style={{ color: 'var(--text-3)', fontSize: 12 }}>{r.grade || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: 15, color: r.is_passed ? '#059669' : '#dc2626' }}>{r.score}%</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>{r.correct}</span>
                    {' / '}
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{r.wrong}</span>
                    {' / '}
                    {r.blank}
                  </td>
                  <td>
                    <span className={`badge ${r.is_passed ? 'badge-green' : 'badge-red'}`}>
                      {r.is_passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </span>
                  </td>
                  <td className="omr-hide-sm" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {new Date(r.scanned_at).toLocaleDateString('th-TH', { day:'numeric', month:'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Main Admin Component ──────────────────────────────────────── */
export default function OMRAdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<'exams' | 'scan'>('exams')
  const [exams, setExams] = useState<OMRExam[]>([])
  const [results, setResults] = useState<Record<string, OMRResult[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [scanning, setScanning] = useState<OMRExam | null>(null)
  const [sheetExam, setSheetExam] = useState<OMRExam | null>(null)
  const [scanResult, setScanResult] = useState<{ exam: OMRExam; answers: Record<number,number> } | null>(null)
  const [loading, setLoading] = useState(true)

  // convert question-based answers (Record<string,number>) → num-based (Record<number,number>)
  function normalizeAnswers(raw: Record<string, number>, exam: OMRExam): Record<number, number> {
    const out: Record<number, number> = {}
    Object.entries(raw).forEach(([k, v]) => { out[Number(k)] = v })
    return out
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('omr_exams').select('*').order('created_at', { ascending: false })
      setExams((data ?? []) as OMRExam[])
      setLoading(false)
    }
    load()
  }, [])

  async function loadResults(examId: string) {
    if (results[examId]) return
    const { data } = await supabase.from('omr_results').select('*').eq('exam_id', examId).order('scanned_at', { ascending: false })
    setResults(p => ({ ...p, [examId]: (data ?? []) as OMRResult[] }))
  }

  async function deleteExam(exam: OMRExam) {
    if (!confirm(`ลบ "${exam.title}"? ผลการสแกนทั้งหมดจะถูกลบด้วย`)) return
    await supabase.from('omr_results').delete().eq('exam_id', exam.id)
    await supabase.from('omr_exams').delete().eq('id', exam.id)
    setExams(p => p.filter(e => e.id !== exam.id))
    toast.success('ลบแล้ว')
  }

  function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadResults(id)
  }

  // ── Scan result handler ──────────────────────────────────────────
  function handleScanResult(exam: OMRExam, rawAnswers: Record<string, number>) {
    const normalized = normalizeAnswers(rawAnswers, exam)
    setScanResult({ exam, answers: normalized })
    setScanning(null)
    setTab('exams')
  }

  // ── Mock questions for scanner (OMR uses num-based, not id-based) ─
  function buildMockQuestions(exam: OMRExam) {
    return Array.from({ length: exam.num_questions }, (_, i) => ({
      id: String(i + 1),
      type: 'mcq' as const,
      question_text: `ข้อ ${i + 1}`,
      options: Array.from({ length: exam.options_per_q }, (_, oi) => ({ label: LABELS[oi], text: LABELS[oi] })),
      correct_answer: String(exam.answer_keys.find(k => k.questionNum === i + 1)?.correctOption ?? 0),
      quiz_id: exam.id,
      order: i + 1,
    }))
  }

  if (scanning) {
    const mockQuestions = buildMockQuestions(scanning)
    return (
      <OMRScanner
        quiz={{ id: scanning.id, title: scanning.title, pass_score: scanning.pass_score, time_limit: null } as any}
        questions={mockQuestions as any}
        onResult={(answers) => handleScanResult(scanning, answers)}
        onClose={() => setScanning(null)}
      />
    )
  }

  if (sheetExam) {
    const mockQuestions = buildMockQuestions(sheetExam)
    return (
      <OMRSheetGenerator
        quiz={{ id: sheetExam.id, title: sheetExam.title, pass_score: sheetExam.pass_score, time_limit: null } as any}
        questions={mockQuestions as any}
        onClose={() => setSheetExam(null)}
      />
    )
  }

  if (scanResult) {
    return (
      <OMRResultClient
        exam={scanResult.exam}
        scanResult={{
          examId: scanResult.exam.id,
          studentName: '',
          studentCode: '',
          grade: '',
          answers: scanResult.answers,
          scannedAt: new Date().toISOString(),
        }}
        onRescan={() => { setScanResult(null); setScanning(scanResult.exam) }}
        onClose={() => setScanResult(null)}
      />
    )
  }

  return (
    <div className="omr-admin">
      <style>{CSS}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 4 }}>OMR SYSTEM</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--on-surface)', lineHeight: 1.2 }}>ระบบตรวจกระดาษคำตอบ</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap: 6 }}>
          <Plus size={14} /> สร้างชุดข้อสอบ OMR
        </button>
      </div>

      {/* Tabs */}
      <div className="omr-tabs">
        <button className={`omr-tab ${tab === 'exams' ? 'active' : ''}`} onClick={() => setTab('exams')}>📋 ชุดข้อสอบ ({exams.length})</button>
        <button className={`omr-tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>📷 สแกนใหม่</button>
      </div>

      {/* Tab: Exams */}
      {tab === 'exams' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28, borderWidth: 3 }} />
              <p>กำลังโหลด...</p>
            </div>
          ) : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>ยังไม่มีชุดข้อสอบ OMR</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>สร้างชุดข้อสอบแรกเพื่อเริ่มใช้งาน</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ สร้างเลย</button>
            </div>
          ) : (
            exams.map(exam => (
              <div key={exam.id} className="omr-exam-card fade-up">
                {/* Exam header */}
                <div className="omr-exam-header" onClick={() => toggleExpand(exam.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {exam.num_questions} ข้อ &nbsp;·&nbsp;
                      {exam.options_per_q} ตัวเลือก &nbsp;·&nbsp;
                      ผ่าน {exam.pass_score}%
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setSheetExam(exam) }} title="พิมพ์กระดาษคำตอบ">
                      <FileText size={13} /> กระดาษ
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); setScanning(exam) }} title="สแกนกระดาษคำตอบ">
                      <Scan size={13} /> สแกน
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteExam(exam) }}>
                      <Trash2 size={13} />
                    </button>
                    {expanded === exam.id ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                  </div>
                </div>

                {/* Expanded: answer keys + results */}
                {expanded === exam.id && (
                  <div>
                    {/* Answer key display */}
                    <div style={{ padding: '10px 18px 6px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>เฉลย</p>
                      <div className="omr-key-grid">
                        {exam.answer_keys.sort((a,b) => a.questionNum - b.questionNum).map(k => (
                          <div key={k.questionNum} className="omr-key-cell">
                            <span className="omr-key-num">{k.questionNum}</span>
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                              background: 'var(--primary)', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {LABELS[k.correctOption]}
                            </span>
                          </div>
                        ))}
                        {exam.answer_keys.length < exam.num_questions && (
                          <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                            ⚠️ ยังไม่ได้ตั้งเฉลย {exam.num_questions - exam.answer_keys.length} ข้อ
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Results */}
                    <div style={{ padding: '14px 18px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-low)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ผลการสแกน</p>
                      <ResultsTable results={results[exam.id] ?? []} exam={exam} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Quick Scan */}
      {tab === 'scan' && (
        <div style={{ padding: '20px 0' }}>
          {exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <p style={{ fontSize: 14 }}>ต้องสร้างชุดข้อสอบก่อน</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setShowCreate(true); setTab('exams') }}>+ สร้างชุดข้อสอบ</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>เลือกชุดข้อสอบที่ต้องการสแกน:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {exams.map(exam => (
                  <div key={exam.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 'var(--r-xl)', background: 'var(--surface-lowest)', border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.18s' }}
                    onClick={() => setScanning(exam)}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,80,203,0.3)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,80,203,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{exam.num_questions} ข้อ · ผ่าน {exam.pass_score}%</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--r-full)', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 12 }}>
                      <Scan size={13} /> สแกน
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showCreate && createPortal(
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={exam => { setExams(p => [exam, ...p]); setShowCreate(false) }}
        />,
        document.body
      )}
    </div>
  )
}