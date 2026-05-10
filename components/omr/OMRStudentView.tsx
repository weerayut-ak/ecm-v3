'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Clock, ArrowLeft, Search, Scan } from 'lucide-react'
import OMRScanner from './OMRScanner'

const LABELS = ['A', 'B', 'C', 'D', 'E']

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
  exam?: {
    title: string
    num_questions: number
    pass_score: number
    answer_keys: { questionNum: number; correctOption: number }[]
  }
}

/* ── Props ───────────────────────────────────────────────────────── */
interface Props {
  studentCode?: string
  onBack?: () => void        // ปุ่มย้อนกลับ (optional)
}

/* ── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
  .omr-sv { max-width: 700px; margin: 0 auto; padding: 0 4px; }
  .omr-sv-header { margin-bottom: 18px; }
  .omr-sv-toolbar {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px; flex-wrap: wrap;
  }
  .omr-sv-search-row {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .omr-sv-search-input {
    flex: 1; min-width: 140px; padding: 8px 12px;
    border-radius: 10px; border: 1.5px solid var(--border, #e5e7eb);
    font-size: 13px; font-family: monospace; font-weight: 700;
    background: var(--surface, #fff); color: #111;
    outline: none; letter-spacing: 0.05em;
  }
  .omr-sv-search-input:focus { border-color: var(--primary, #0050cb); }

  .omr-result-card {
    background: var(--surface-lowest, #f9fafb);
    border-radius: 18px;
    border: 1px solid var(--border, #e5e7eb);
    overflow: hidden;
    margin-bottom: 12px;
    transition: box-shadow 0.2s;
  }
  .omr-result-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

  .omr-answer-mini {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    gap: 4px;
    padding: 12px 16px 16px;
  }

  .sv-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 8px 14px; border-radius: 999px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    border: 1.5px solid var(--border, #e5e7eb);
    background: var(--surface, #fff); color: var(--text-2, #374151);
    transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .sv-btn:hover { background: var(--surface-low, #f3f4f6); }
  .sv-btn.primary {
    background: var(--primary, #0050cb); color: white;
    border-color: var(--primary, #0050cb);
    box-shadow: 0 2px 10px rgba(0,80,203,0.25);
  }
  .sv-btn.primary:hover { opacity: 0.9; }

  /* Serial badge */
  .serial-badge {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 999px;
    background: rgba(107,33,168,0.08);
    border: 1px solid rgba(107,33,168,0.2);
    font-family: monospace; font-size: 10px; font-weight: 800;
    color: #6b21a8; letter-spacing: 0.05em;
  }

  @media (max-width: 480px) {
    .omr-answer-mini { grid-template-columns: repeat(6, 1fr); gap: 3px; }
    .omr-sv-search-row { flex-direction: column; }
    .omr-sv-search-input { min-width: 0; }
  }
`

/* ── Score Ring ─────────────────────────────────────────────────── */
function ScoreRing({ score, pass }: { score: number; pass: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const isPassed = score >= pass
  const color = isPassed ? '#059669' : '#dc2626'
  return (
    <svg width={88} height={88} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--surface-highest, #e5e7eb)" strokeWidth={7} />
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

/* ── Result Card ─────────────────────────────────────────────────── */
function ResultCard({ result }: { result: OMRResult }) {
  const [open, setOpen] = useState(false)
  const exam = result.exam
  const isPassed = result.is_passed

  return (
    <div className="omr-result-card">
      {/* Header */}
      <div
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <ScoreRing score={result.score} pass={exam?.pass_score ?? 60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ fontWeight: 800, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exam?.title ?? 'ข้อสอบ OMR'}
            </h3>
            {result.sheet_serial && (
              <span className="serial-badge">#{result.sheet_serial}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-3, #9ca3af)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isPassed
                ? <CheckCircle2 size={13} color="#059669" />
                : <XCircle size={13} color="#dc2626" />}
              <span style={{ fontWeight: 700, color: isPassed ? '#059669' : '#dc2626' }}>
                {isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
              </span>
              <span>(เกณฑ์ {exam?.pass_score}%)</span>
            </span>
            <span>✓ {result.correct} &nbsp;✗ {result.wrong} &nbsp;— {result.blank}</span>
            {result.student_name && <span style={{ fontWeight: 600 }}>{result.student_name}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {new Date(result.scanned_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 16, color: 'var(--text-3, #9ca3af)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</div>
      </div>

      {/* Expanded answer review */}
      {open && exam && (
        <div style={{ borderTop: '1px solid var(--border, #e5e7eb)' }}>
          <div style={{ padding: '10px 16px 4px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'ถูก',  value: result.correct, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
              { label: 'ผิด',  value: result.wrong,   color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
              { label: 'ว่าง', value: result.blank,   color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: s.bg }}>
                <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3, #9ca3af)', fontWeight: 600 }}>{s.label}</span>
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
                <div key={key.questionNum} style={{ borderRadius: 8, border: `1.5px solid ${border}`, background: bg, padding: '4px 2px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'var(--text-3, #9ca3af)', fontWeight: 700 }}>{key.questionNum}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color }}>{isBlank ? '—' : LABELS[studentAns]}</div>
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

/* ── Main Component ─────────────────────────────────────────────── */
export default function OMRStudentView({ studentCode, onBack }: Props) {
  const supabase = createClient()
  const [results, setResults]         = useState<OMRResult[]>([])
  const [loading, setLoading]         = useState(true)
  const [searchCode, setSearchCode]   = useState(studentCode ?? '')
  const [activeCode, setActiveCode]   = useState(studentCode ?? '')
  const [serialInput, setSerialInput] = useState('')
  const [showBarcodeScan, setShowBarcodeScan] = useState(false)
  const [serialResult, setSerialResult] = useState<OMRResult | null | 'notfound' | 'loading'>(null)

  useEffect(() => {
    if (!activeCode) { setLoading(false); setResults([]); return }
    setLoading(true)
    const query = supabase
      .from('omr_results')
      .select('*, exam:omr_exams(title, num_questions, pass_score, answer_keys)')
      .eq('student_code', activeCode)
      .order('scanned_at', { ascending: false })

    query.then(({ data }) => {
      setResults((data ?? []) as OMRResult[])
      setLoading(false)
    })
  }, [activeCode])

  /* ── ค้นหาด้วย serial ──────────────────────────────────────────── */
  async function lookupSerial(serial: string) {
    if (!serial.trim()) return
    setSerialResult('loading')
    const { data } = await supabase
      .from('omr_results')
      .select('*, exam:omr_exams(title, num_questions, pass_score, answer_keys)')
      .eq('sheet_serial', serial.trim().toUpperCase())
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSerialResult(data ? (data as OMRResult) : 'notfound')
  }

  /* ── barcode scan callback ──────────────────────────────────────── */
  function handleBarcodeFound(serial: string) {
    setShowBarcodeScan(false)
    setSerialInput(serial)
    lookupSerial(serial)
  }

  /* ── Serial lookup overlay ─────────────────────────────────────── */
  if (showBarcodeScan) {
    return (
      <OMRScanner
        quiz={{ id: 'sv-lookup', title: 'ค้นหาด้วยบาร์โค้ด', pass_score: 0, time_limit: null } as any}
        questions={[]}
        onResult={() => {}}
        onClose={() => setShowBarcodeScan(false)}
        barcodeOnlyMode={true}
        onBarcodeFound={handleBarcodeFound}
      />
    )
  }

  return (
    <div className="omr-sv">
      <style>{CSS}</style>

      {/* Header + back button */}
      <div className="omr-sv-toolbar">
        {onBack && (
          <button className="sv-btn" onClick={onBack}>
            <ArrowLeft size={14} /> ย้อนกลับ
          </button>
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary, #0050cb)', margin: 0, lineHeight: 1 }}>OMR RESULTS</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--on-surface, #111)', margin: '3px 0 0' }}>ผลการสอบ</h2>
        </div>
      </div>

      {/* ── ค้นหาด้วยรหัสนักเรียน ── */}
      {!studentCode && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3, #9ca3af)', marginBottom: 8 }}>ค้นหาด้วยรหัสนักเรียน</p>
          <div className="omr-sv-search-row">
            <input
              className="omr-sv-search-input"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              placeholder="รหัสนักเรียน..."
              onKeyDown={e => { if (e.key === 'Enter' && searchCode) setActiveCode(searchCode) }}
            />
            <button className="sv-btn primary" onClick={() => { if (searchCode) setActiveCode(searchCode) }}>
              <Search size={13} /> ค้นหา
            </button>
          </div>
        </div>
      )}

      {/* ── ตรวจสอบด้วยบาร์โค้ดกระดาษ ── */}
      <div style={{
        background: 'var(--surface, #fff)', border: '1.5px solid var(--border, #e5e7eb)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          🔍 ตรวจสอบด้วยรหัสกระดาษ
        </p>
        <div className="omr-sv-search-row" style={{ marginBottom: 0 }}>
          <input
            className="omr-sv-search-input"
            value={serialInput}
            onChange={e => setSerialInput(e.target.value.toUpperCase().trim())}
            placeholder="รหัสกระดาษ เช่น EX250001"
            onKeyDown={e => { if (e.key === 'Enter' && serialInput) lookupSerial(serialInput) }}
          />
          <button className="sv-btn" onClick={() => { if (serialInput) lookupSerial(serialInput) }} disabled={!serialInput}>
            <Search size={13} /> ค้นหา
          </button>
          <button className="sv-btn primary" onClick={() => setShowBarcodeScan(true)}>
            <Scan size={13} /> สแกนบาร์โค้ด
          </button>
        </div>

        {/* Serial lookup result */}
        {serialResult === 'loading' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3, #9ca3af)', fontSize: 13 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border, #e5e7eb)', borderTopColor: 'var(--primary, #0050cb)', display: 'inline-block', animation: 'sv-spin 0.7s linear infinite' }} />
            กำลังค้นหา...
          </div>
        )}
        {serialResult === 'notfound' && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            ❌ ไม่พบรหัสกระดาษ "{serialInput}" ในระบบ
          </div>
        )}
        {serialResult && serialResult !== 'loading' && serialResult !== 'notfound' && (
          <div style={{ marginTop: 12 }}>
            <ResultCard result={serialResult as OMRResult} />
            <button
              className="sv-btn"
              onClick={() => setSerialResult(null)}
              style={{ marginTop: 4 }}
            >✕ ปิดผลลัพธ์</button>
          </div>
        )}
      </div>

      <style>{`@keyframes sv-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── ผลการสอบทั้งหมดของนักเรียน ── */}
      {activeCode && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3, #9ca3af)', marginBottom: 10 }}>
            ผลการสอบของรหัส <span style={{ fontFamily: 'monospace', color: 'var(--primary, #0050cb)', fontWeight: 800 }}>{activeCode}</span>
          </p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3, #9ca3af)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 26, height: 26, borderWidth: 3 }} />
              <p>กำลังโหลด...</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>ไม่พบผลการสอบ</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3, #9ca3af)' }}>
                ยังไม่มีผลการสอบสำหรับรหัส {activeCode}
              </p>
            </div>
          ) : (
            results.map(r => <ResultCard key={r.id} result={r} />)
          )}
        </div>
      )}

      {/* กรณียังไม่ได้ค้นหา */}
      {!activeCode && !studentCode && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3, #9ca3af)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <p style={{ fontSize: 14 }}>ใส่รหัสนักเรียนหรือสแกนบาร์โค้ดเพื่อดูผลการสอบ</p>
        </div>
      )}
    </div>
  )
}
