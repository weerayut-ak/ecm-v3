'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Trash2, Download, ChevronDown, ChevronUp, Scan, FileText, Search, ArrowLeft } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import OMRScanner from './OMRScanner'
import OMRSheetGenerator from './OMRSheetGenerator'
import OMRResultClient from './OMRResultClient'

const LABELS = ['A','B','C','D','E']

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
  sheet_serial: string | null
  answers: Record<number, number>
  score: number
  correct: number
  wrong: number
  blank: number
  is_passed: boolean
  scanned_at: string
}

/* ── CSS (mobile-first) ──────────────────────────────────────────── */
const CSS = `
  .omr-admin { max-width: 1000px; margin: 0 auto; font-family: var(--font, system-ui); padding: 0 4px; }
  .omr-page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
  .omr-tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--border,#e5e7eb); margin-bottom: 18px; overflow-x: auto; scrollbar-width: none; }
  .omr-tabs::-webkit-scrollbar { display: none; }
  .omr-tab {
    padding: 9px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
    border: none; background: none; font-family: inherit;
    color: var(--text-3,#9ca3af); border-bottom: 3px solid transparent;
    margin-bottom: -2px; transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .omr-tab:hover { color: var(--text,#111); }
  .omr-tab.active { color: var(--primary,#0050cb); border-bottom-color: var(--primary,#0050cb); }

  .omr-exam-card { background: var(--surface-lowest,#f9fafb); border-radius: 18px; border: 1px solid var(--border,#e5e7eb); margin-bottom: 12px; overflow: hidden; transition: box-shadow 0.2s; }
  .omr-exam-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .omr-exam-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; }
  .omr-exam-title { flex: 1; min-width: 0; }
  .omr-exam-title h3 { font-weight: 800; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }
  .omr-exam-title p { font-size: 11px; color: var(--text-3,#9ca3af); margin: 2px 0 0; }
  .omr-exam-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }

  .omr-key-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 6px; padding: 12px 16px 16px; background: var(--surface-low,#f3f4f6); }
  .omr-key-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .omr-key-num { font-size: 9px; font-weight: 700; color: var(--text-3,#9ca3af); }

  .omr-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .omr-results-table th { padding: 8px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3,#9ca3af); background: var(--surface-low,#f3f4f6); border-bottom: 1.5px solid var(--border,#e5e7eb); text-align: left; white-space: nowrap; }
  .omr-results-table td { padding: 9px 12px; border-bottom: 1px solid var(--surface-highest,#e5e7eb); }
  .omr-results-table tbody tr:hover td { background: var(--surface-low,#f3f4f6); }

  /* Barcode lookup panel */
  .barcode-lookup-panel { background: var(--surface-lowest,#f9fafb); border: 1.5px solid var(--border,#e5e7eb); border-radius: 18px; padding: 24px; text-align: center; }

  /* stat pills */
  .stat-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .stat-chip { padding: 5px 12px; border-radius: 999px; background: var(--surface-highest,#e5e7eb); display: flex; gap: 5px; align-items: center; }

  @media (max-width: 600px) {
    .omr-key-grid { grid-template-columns: repeat(5, 1fr); }
    .omr-hide-sm { display: none !important; }
    .omr-exam-actions .btn-sm { padding: 5px 10px; font-size: 11px; }
    .omr-exam-header { padding: 12px 12px; }
    .omr-page-header h1 { font-size: 20px; }
    .omr-tab { padding: 8px 12px; font-size: 12px; }
    .omr-results-table th, .omr-results-table td { padding: 7px 8px; font-size: 12px; }
  }
`

/* ── Answer key editor ──────────────────────────────────────────── */
function AnswerKeyEditor({ numQ, optPerQ, keys, onChange }: {
  numQ: number; optPerQ: number
  keys: { questionNum: number; correctOption: number }[]
  onChange: (keys: { questionNum: number; correctOption: number }[]) => void
}) {
  function setKey(qNum: number, opt: number) {
    const next = keys.filter(k => k.questionNum !== qNum)
    next.push({ questionNum: qNum, correctOption: opt })
    next.sort((a,b) => a.questionNum - b.questionNum)
    onChange(next)
  }
  function getKey(qNum: number) {
    return keys.find(k => k.questionNum === qNum)?.correctOption ?? -1
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(50px,1fr))', gap:6 }}>
      {Array.from({ length:numQ }, (_, i) => {
        const q = i+1; const sel = getKey(q)
        return (
          <div key={q} style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--text-3,#9ca3af)', marginBottom:4 }}>ข้อ {q}</div>
            <div style={{ display:'flex', gap:2, justifyContent:'center', flexWrap:'wrap' }}>
              {Array.from({ length:optPerQ }, (_, oi) => (
                <button key={oi} onClick={() => setKey(q, oi)} style={{
                  width:20, height:20, borderRadius:'50%', fontSize:9, fontWeight:800,
                  border:`1.5px solid ${sel===oi ? 'var(--primary,#0050cb)' : 'var(--border,#e5e7eb)'}`,
                  background: sel===oi ? 'var(--primary,#0050cb)' : 'var(--surface,#fff)',
                  color: sel===oi ? 'white' : 'var(--text-3,#9ca3af)',
                  cursor:'pointer', transition:'all 0.12s',
                }}>{LABELS[oi]}</button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Create Exam Modal ──────────────────────────────────────────── */
function CreateExamModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (exam: OMRExam) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ title:'', description:'', num_questions:30, options_per_q:4, pass_score:60 })
  const [keys, setKeys] = useState<{ questionNum:number; correctOption:number }[]>([])
  const [step, setStep] = useState<'info'|'keys'>('info')
  const [saving, setSaving] = useState(false)
  const unset = form.num_questions - keys.length

  async function save() {
    if (!form.title.trim()) { toast.error('กรุณาใส่ชื่อข้อสอบ'); return }
    if (keys.length < form.num_questions && !confirm(`ยังไม่ได้ตั้งเฉลย ${unset} ข้อ — บันทึกต่อไหม?`)) return
    setSaving(true)
    const { data, error } = await supabase.from('omr_exams').insert({ ...form, answer_keys:keys }).select().single()
    setSaving(false)
    if (error || !data) { toast.error('สร้างไม่สำเร็จ: ' + error?.message); return }
    toast.success('สร้างข้อสอบ OMR แล้ว ✓')
    onCreated(data as OMRExam)
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:step==='keys'?700:460 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight:800, fontSize:16 }}>{step==='info' ? '📝 สร้างข้อสอบ OMR ใหม่' : '✏️ ตั้งเฉลย'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {step==='info' ? (
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="form-label">ชื่อข้อสอบ *</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({...p,title:e.target.value}))} placeholder="เช่น สอบกลางภาค ม.2" />
            </div>
            <div>
              <label className="form-label">คำอธิบาย</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({...p,description:e.target.value}))} style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <label className="form-label">จำนวนข้อ</label>
                <input className="input" type="number" min={1} max={100} value={form.num_questions} onChange={e => setForm(p => ({...p,num_questions:Number(e.target.value)}))} />
              </div>
              <div>
                <label className="form-label">ตัวเลือก/ข้อ</label>
                <select className="input" value={form.options_per_q} onChange={e => setForm(p => ({...p,options_per_q:Number(e.target.value)}))}>
                  {[2,3,4,5].map(n => <option key={n} value={n}>{n} (A-{LABELS[n-1]})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">คะแนนผ่าน (%)</label>
                <input className="input" type="number" min={1} max={100} value={form.pass_score} onChange={e => setForm(p => ({...p,pass_score:Number(e.target.value)}))} />
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <p style={{ fontSize:12, color:'var(--text-3,#9ca3af)', marginBottom:14 }}>
              ตั้งเฉลยทั้ง {form.num_questions} ข้อ &nbsp;·&nbsp;
              <span style={{ color:unset>0?'#d97706':'#059669', fontWeight:700 }}>
                {unset>0 ? `ยังไม่ได้ตั้ง ${unset} ข้อ` : '✓ ครบทุกข้อ'}
              </span>
            </p>
            <div style={{ maxHeight:380, overflowY:'auto', paddingRight:4 }}>
              <AnswerKeyEditor numQ={form.num_questions} optPerQ={form.options_per_q} keys={keys} onChange={setKeys} />
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ justifyContent:'space-between' }}>
          {step==='info' ? (
            <>
              <button className="btn" onClick={onClose}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={() => setStep('keys')} disabled={!form.title.trim()}>ถัดไป: ตั้งเฉลย →</button>
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

/* ── Results Table ──────────────────────────────────────────────── */
function ResultsTable({ results, exam }: { results: OMRResult[]; exam: OMRExam }) {
  function exportAll() {
    if (!results.length) { toast.error('ยังไม่มีผลลัพธ์'); return }
    const headers = ['รหัสกระดาษ','ชื่อ','รหัส','ชั้น','คะแนน(%)','ถูก','ผิด','ว่าง','ผล',
      ...Array.from({ length:exam.num_questions }, (_,i) => `ข้อ${i+1}`),
      ...Array.from({ length:exam.num_questions }, (_,i) => `เฉลย${i+1}`),
    ]
    const rows = results.map(r => [
      r.sheet_serial ?? '',
      r.student_name, r.student_code, r.grade,
      r.score, r.correct, r.wrong, r.blank,
      r.is_passed ? 'ผ่าน' : 'ไม่ผ่าน',
      ...Array.from({ length:exam.num_questions }, (_,i) => LABELS[r.answers[i+1]??-1]??'-'),
      ...exam.answer_keys.map(k => LABELS[k.correctOption]),
    ])
    const csv = [headers,...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `omr-results-${exam.title.replace(/\s+/g,'-')}.csv`
    a.click()
  }

  const avg = results.length ? Math.round(results.reduce((s,r) => s+r.score, 0)/results.length) : 0
  const passed = results.filter(r => r.is_passed).length

  return (
    <div>
      <div className="stat-row" style={{ marginBottom:14 }}>
        <div style={{ flex:1, display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { label:'สแกนแล้ว', value:results.length,          color:'var(--primary,#0050cb)' },
            { label:'ผ่าน',     value:passed,                   color:'#059669' },
            { label:'ไม่ผ่าน', value:results.length-passed,    color:'#dc2626' },
            { label:'เฉลี่ย',  value:`${avg}%`,                color:'var(--text-2,#374151)' },
          ].map(s => (
            <div key={s.label} className="stat-chip">
              <span style={{ fontWeight:800, color:s.color, fontSize:14 }}>{s.value}</span>
              <span style={{ fontSize:11, color:'var(--text-3,#9ca3af)', fontWeight:600 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <button onClick={exportAll} className="btn" style={{ gap:6, flexShrink:0 }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {results.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3,#9ca3af)' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
          <p style={{ fontSize:14 }}>ยังไม่มีผลการสแกน</p>
        </div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:16, border:'1px solid var(--border,#e5e7eb)' }}>
          <table className="omr-results-table">
            <thead>
              <tr>
                <th className="omr-hide-sm">รหัสกระดาษ</th>
                <th>ชื่อ</th>
                <th className="omr-hide-sm">รหัส</th>
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
                  <td className="omr-hide-sm">
                    {r.sheet_serial
                      ? <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:'#6b21a8', background:'rgba(107,33,168,0.08)', padding:'2px 7px', borderRadius:5 }}>{r.sheet_serial}</span>
                      : <span style={{ color:'var(--text-3,#9ca3af)', fontSize:11 }}>—</span>}
                  </td>
                  <td style={{ fontWeight:700, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.student_name || '—'}</td>
                  <td className="omr-hide-sm" style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-3,#9ca3af)' }}>{r.student_code || '—'}</td>
                  <td className="omr-hide-sm" style={{ color:'var(--text-3,#9ca3af)', fontSize:12 }}>{r.grade || '—'}</td>
                  <td><span style={{ fontWeight:800, fontSize:14, color:r.is_passed?'#059669':'#dc2626' }}>{r.score}%</span></td>
                  <td style={{ fontSize:12 }}>
                    <span style={{ color:'#059669', fontWeight:700 }}>{r.correct}</span>
                    {' / '}
                    <span style={{ color:'#dc2626', fontWeight:700 }}>{r.wrong}</span>
                    {' / '}
                    {r.blank}
                  </td>
                  <td>
                    <span className={`badge ${r.is_passed ? 'badge-green' : 'badge-red'}`}>
                      {r.is_passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </span>
                  </td>
                  <td className="omr-hide-sm" style={{ fontSize:11, color:'var(--text-3,#9ca3af)', whiteSpace:'nowrap' }}>
                    {new Date(r.scanned_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })}
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

/* ── Barcode Lookup result viewer ───────────────────────────────── */
function BarcodeResultViewer({ serial, exams, onClose }: {
  serial: string
  exams: OMRExam[]
  onClose: () => void
}) {
  const supabase = createClient()
  const [result, setResult] = useState<OMRResult | null | 'loading' | 'notfound'>('loading')
  const [exam, setExam] = useState<OMRExam | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('omr_results')
        .select('*')
        .eq('sheet_serial', serial)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error || !data) { setResult('notfound'); return }
      let foundExam = exams.find(e => e.id === data.exam_id)
      // ถ้าไม่เจอใน cache ให้ fetch จาก DB
      if (!foundExam) {
        const { data: examData } = await supabase
          .from('omr_exams').select('*').eq('id', data.exam_id).single()
        foundExam = examData ?? undefined
      }
      setExam(foundExam ?? null)
      setResult(data as OMRResult)
    }
    load()
  }, [serial])

  if (result === 'loading') return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3,#9ca3af)' }}>
      <div className="spinner" style={{ margin:'0 auto 12px', width:28, height:28, borderWidth:3 }} />
      <p>กำลังค้นหา #{serial}...</p>
    </div>
  )

  if (result === 'notfound' || !exam) return (
    <div style={{ textAlign:'center', padding:'60px 0' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>ไม่พบรหัส #{serial}</h3>
      <p style={{ fontSize:13, color:'var(--text-3,#9ca3af)', marginBottom:20 }}>รหัสกระดาษนี้ยังไม่มีในระบบ</p>
      <button className="btn" onClick={onClose}>← ย้อนกลับ</button>
    </div>
  )

  return (
    <OMRResultClient
      exam={exam}
      scanResult={{
        examId: result.exam_id,
        studentName: result.student_name,
        studentCode: result.student_code,
        grade: result.grade,
        answers: result.answers,
        scannedAt: result.scanned_at,
        sheetSerial: result.sheet_serial ?? '',
      }}
      onRescan={onClose}
      onClose={onClose}
      readOnly={true}
    />
  )
}

/* ── Main Admin Dashboard ───────────────────────────────────────── */
type AppView =
  | { type: 'dashboard' }
  | { type: 'scanning'; exam: OMRExam }
  | { type: 'sheet'; exam: OMRExam }
  | { type: 'result'; exam: OMRExam; answers: Record<number,number>; serial: string }
  | { type: 'barcode_scan' }
  | { type: 'barcode_result'; serial: string }

export default function OMRAdminDashboard() {
  const supabase = createClient()
  const [view, setView]           = useState<AppView>({ type:'dashboard' })
  const [tab, setTab]             = useState<'exams'|'scan'|'barcode'>('exams')
  const [exams, setExams]         = useState<OMRExam[]>([])
  const [results, setResults]     = useState<Record<string,OMRResult[]>>({})
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [manualSerial, setManualSerial] = useState('')

  function normalizeAnswers(raw: Record<string,number>): Record<number,number> {
    const out: Record<number,number> = {}
    Object.entries(raw).forEach(([k,v]) => { out[Number(k)] = v })
    return out
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('omr_exams').select('*').order('created_at', { ascending:false })
      setExams((data ?? []) as OMRExam[])
      setLoading(false)
    }
    load()
  }, [])

  async function loadResults(examId: string) {
    if (results[examId]) return
    const { data } = await supabase.from('omr_results').select('*').eq('exam_id', examId).order('scanned_at', { ascending:false })
    setResults(p => ({ ...p, [examId]:(data ?? []) as OMRResult[] }))
  }

  async function deleteExam(exam: OMRExam) {
    if (!confirm(`ลบ "${exam.title}"? ผลการสแกนทั้งหมดจะถูกลบด้วย`)) return
    await supabase.from('omr_results').delete().eq('exam_id', exam.id)
    await supabase.from('omr_exams').delete().eq('id', exam.id)
    setExams(p => p.filter(e => e.id !== exam.id))
    toast.success('ลบแล้ว')
  }

  function toggleExpand(id: string) {
    if (expanded===id) { setExpanded(null); return }
    setExpanded(id)
    loadResults(id)
  }

  function buildMockQuestions(exam: OMRExam) {
    return Array.from({ length:exam.num_questions }, (_,i) => ({
      id: String(i+1), type:'mcq' as const,
      question_text: `ข้อ ${i+1}`,
      options: Array.from({ length:exam.options_per_q }, (_,oi) => ({ label:LABELS[oi], text:LABELS[oi] })),
      correct_answer: String(exam.answer_keys.find(k => k.questionNum===i+1)?.correctOption ?? 0),
      quiz_id: exam.id, order: i+1,
    }))
  }

  // ── Scanning exam ──
  if (view.type === 'scanning') {
    const exam = view.exam
    return (
      <OMRScanner
        quiz={{ id:exam.id, title:exam.title, pass_score:exam.pass_score, time_limit:null } as any}
        questions={buildMockQuestions(exam) as any}
        onResult={(rawAnswers, serial) => {
          setView({ type:'result', exam, answers:normalizeAnswers(rawAnswers), serial:serial??'' })
          // Invalidate cached results for this exam
          setResults(p => { const n={...p}; delete n[exam.id]; return n })
        }}
        onClose={() => setView({ type:'dashboard' })}
      />
    )
  }

  // ── Sheet generator ──
  if (view.type === 'sheet') {
    const exam = view.exam
    return (
      <OMRSheetGenerator
        quiz={{ id:exam.id, title:exam.title, pass_score:exam.pass_score, time_limit:null } as any}
        questions={buildMockQuestions(exam) as any}
        onClose={() => setView({ type:'dashboard' })}
      />
    )
  }

  // ── Scan result / entry form ──
  if (view.type === 'result') {
    const examRef = view.exam
    return (
      <OMRResultClient
        exam={examRef}
        scanResult={{
          examId:      examRef.id,
          studentName: '',
          studentCode: '',
          grade:       '',
          answers:     view.answers,
          scannedAt:   new Date().toISOString(),
          sheetSerial: view.serial,
        }}
        onRescan={() => setView({ type:'scanning', exam:examRef })}
        onClose={() => {
          // Invalidate cache so results table shows new entry
          setResults(p => { const n={...p}; delete n[examRef.id]; return n })
          setView({ type:'dashboard' })
        }}
      />
    )
  }

  // ── Barcode scan (camera) ──
  if (view.type === 'barcode_scan') {
    return (
      <OMRScanner
        quiz={{ id:'lookup', title:'ค้นหาด้วยบาร์โค้ด', pass_score:0, time_limit:null } as any}
        questions={[]}
        onResult={() => {}}
        onClose={() => setView({ type:'dashboard' })}
        barcodeOnlyMode={true}
        onBarcodeFound={serial => setView({ type:'barcode_result', serial })}
      />
    )
  }

  // ── Barcode result view ──
  if (view.type === 'barcode_result') {
    return (
      <BarcodeResultViewer
        serial={view.serial}
        exams={exams}
        onClose={() => setView({ type:'dashboard' })}
      />
    )
  }

  // ── Main dashboard ──
  return (
    <div className="omr-admin">
      <style>{CSS}</style>

      <div className="omr-page-header">
        <div>
          <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--primary,#0050cb)', marginBottom:4 }}>OMR SYSTEM</p>
          <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.02em', color:'var(--on-surface,#111)', lineHeight:1.2, margin:0 }}>ระบบตรวจกระดาษคำตอบ</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap:6 }}>
          <Plus size={14} /> สร้างชุดข้อสอบ
        </button>
      </div>

      {/* Tabs */}
      <div className="omr-tabs">
        <button className={`omr-tab ${tab==='exams'?'active':''}`} onClick={() => setTab('exams')}>📋 ชุดข้อสอบ ({exams.length})</button>
        <button className={`omr-tab ${tab==='scan'?'active':''}`} onClick={() => setTab('scan')}>📷 ตรวจข้อสอบ</button>
        <button className={`omr-tab ${tab==='barcode'?'active':''}`} onClick={() => setTab('barcode')}>🔍 สแกนบาร์โค้ด</button>
      </div>

      {/* Tab: Exams */}
      {tab==='exams' && (
        <div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3,#9ca3af)' }}>
              <div className="spinner" style={{ margin:'0 auto 12px', width:28, height:28, borderWidth:3 }} />
              <p>กำลังโหลด...</p>
            </div>
          ) : exams.length===0 ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>ยังไม่มีชุดข้อสอบ OMR</h3>
              <p style={{ fontSize:13, color:'var(--text-3,#9ca3af)', marginBottom:20 }}>สร้างชุดข้อสอบแรกเพื่อเริ่มใช้งาน</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ สร้างเลย</button>
            </div>
          ) : (
            exams.map(exam => (
              <div key={exam.id} className="omr-exam-card">
                <div className="omr-exam-header" onClick={() => toggleExpand(exam.id)}>
                  <div className="omr-exam-title">
                    <h3>{exam.title}</h3>
                    <p>{exam.num_questions} ข้อ · {exam.options_per_q} ตัวเลือก · ผ่าน {exam.pass_score}%</p>
                  </div>
                  <div className="omr-exam-actions">
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setView({ type:'sheet', exam }) }}>
                      <FileText size={12} /> <span className="omr-hide-sm">กระดาษ</span>
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); setView({ type:'scanning', exam }) }}>
                      <Scan size={12} /> สแกน
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteExam(exam) }}>
                      <Trash2 size={12} />
                    </button>
                    {expanded===exam.id ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                  </div>
                </div>

                {expanded===exam.id && (
                  <div>
                    <div style={{ padding:'10px 16px 6px', borderTop:'1px solid var(--border,#e5e7eb)' }}>
                      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3,#9ca3af)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>เฉลย</p>
                      <div className="omr-key-grid">
                        {exam.answer_keys.sort((a,b) => a.questionNum-b.questionNum).map(k => (
                          <div key={k.questionNum} className="omr-key-cell">
                            <span className="omr-key-num">{k.questionNum}</span>
                            <span style={{ width:22, height:22, borderRadius:'50%', fontSize:10, fontWeight:800, background:'var(--primary,#0050cb)', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {LABELS[k.correctOption]}
                            </span>
                          </div>
                        ))}
                        {exam.answer_keys.length < exam.num_questions && (
                          <div style={{ gridColumn:'1/-1', fontSize:11, color:'#d97706', fontWeight:600 }}>
                            ⚠️ ยังไม่ได้ตั้งเฉลย {exam.num_questions-exam.answer_keys.length} ข้อ
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ padding:'14px 16px 16px', borderTop:'1px solid var(--border,#e5e7eb)', background:'var(--surface-low,#f3f4f6)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3,#9ca3af)', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>ผลการสแกน</p>
                        <button onClick={e => { e.stopPropagation(); setResults(p => { const n={...p}; delete n[exam.id]; return n }); loadResults(exam.id) }}
                          style={{ fontSize:11, fontWeight:700, color:'var(--primary,#0050cb)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px' }}>
                          ↻ โหลดใหม่
                        </button>
                      </div>
                      <ResultsTable results={results[exam.id]??[]} exam={exam} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Scan (select exam) */}
      {tab==='scan' && (
        <div style={{ padding:'16px 0' }}>
          {exams.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3,#9ca3af)' }}>
              <p style={{ fontSize:14 }}>ต้องสร้างชุดข้อสอบก่อน</p>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => { setShowCreate(true); setTab('exams') }}>+ สร้างชุดข้อสอบ</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:'var(--text-3,#9ca3af)', marginBottom:14 }}>เลือกชุดข้อสอบที่ต้องการสแกน:</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {exams.map(exam => (
                  <div key={exam.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'14px 16px', borderRadius:16,
                    background:'var(--surface-lowest,#f9fafb)',
                    border:'1.5px solid var(--border,#e5e7eb)',
                    cursor:'pointer', transition:'all 0.18s',
                  }}
                    onClick={() => setView({ type:'scanning', exam })}
                  >
                    <div style={{ width:44, height:44, borderRadius:12, background:'rgba(0,80,203,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📋</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{exam.title}</p>
                      <p style={{ fontSize:11, color:'var(--text-3,#9ca3af)', margin:'2px 0 0' }}>{exam.num_questions} ข้อ · ผ่าน {exam.pass_score}%</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:'var(--primary,#0050cb)', color:'white', fontWeight:700, fontSize:12, flexShrink:0 }}>
                      <Scan size={13} /> สแกน
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Barcode lookup */}
      {tab==='barcode' && (
        <div style={{ padding:'16px 0' }}>
          <div className="barcode-lookup-panel">
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>ตรวจสอบย้อนหลังด้วยบาร์โค้ด</h3>
            <p style={{ fontSize:13, color:'var(--text-3,#9ca3af)', marginBottom:20, lineHeight:1.5 }}>
              สแกนบาร์โค้ดบนกระดาษคำตอบ หรือกรอกรหัสกระดาษเพื่อค้นหาผลการสอบ
            </p>

            {/* Camera scan */}
            <button
              className="btn btn-primary"
              style={{ gap:8, padding:'12px 24px', fontSize:14, marginBottom:20 }}
              onClick={() => setView({ type:'barcode_scan' })}
            >
              <Scan size={16} /> สแกนบาร์โค้ดด้วยกล้อง
            </button>

            {/* Manual entry */}
            <div style={{ borderTop:'1px solid var(--border,#e5e7eb)', paddingTop:20 }}>
              <p style={{ fontSize:12, color:'var(--text-3,#9ca3af)', marginBottom:12, fontWeight:600 }}>หรือกรอกรหัสกระดาษด้วยตนเอง</p>
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <input
                  value={manualSerial}
                  onChange={e => setManualSerial(e.target.value.toUpperCase().trim())}
                  placeholder="เช่น EX250001"
                  onKeyDown={e => { if (e.key==='Enter' && manualSerial) setView({ type:'barcode_result', serial:manualSerial }) }}
                  style={{
                    padding:'10px 14px', borderRadius:10, fontSize:14, fontWeight:800,
                    fontFamily:'monospace', letterSpacing:'0.06em',
                    border:'1.5px solid var(--border,#e5e7eb)',
                    background:'var(--surface,#fff)', color:'#111',
                    width:'100%', maxWidth:240,
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => { if (manualSerial) setView({ type:'barcode_result', serial:manualSerial }) }}
                  disabled={!manualSerial}
                  style={{ gap:6, padding:'10px 18px' }}
                >
                  <Search size={14} /> ค้นหา
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && createPortal(
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={exam => { setExams(p => [exam,...p]); setShowCreate(false) }}
        />,
        document.body
      )}
    </div>
  )
}
