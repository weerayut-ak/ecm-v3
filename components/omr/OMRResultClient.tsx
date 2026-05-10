'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, RotateCcw, ArrowLeft, Save } from 'lucide-react'

const LABELS = ['A','B','C','D','E']

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
  sheetSerial?: string
}

interface Props {
  exam: OMRExam
  scanResult: ScanResultInput
  onRescan: () => void
  onClose: () => void
  /** ถ้าเป็น true = โหมดดูผลเก่า (ไม่ต้องบันทึก) */
  readOnly?: boolean
}

function calcScore(answers: Record<number, number>, keys: OMRExam['answer_keys'], numQ: number) {
  let correct = 0, wrong = 0, blank = 0
  for (let i = 1; i <= numQ; i++) {
    const ans = answers[i]
    const key = keys.find(k => k.questionNum === i)
    if (ans === undefined || ans < 0) { blank++; continue }
    if (key && ans === key.correctOption) correct++
    else wrong++
  }
  return { correct, wrong, blank, score: numQ > 0 ? Math.round((correct/numQ)*100) : 0 }
}

function ScoreRing({ score, pass }: { score: number; pass: number }) {
  const r = 52, circ = 2*Math.PI*r
  const offset = circ - (score/100)*circ
  const isPassed = score >= pass
  const color = isPassed ? '#059669' : '#dc2626'
  return (
    <svg width={120} height={120} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={60} cy={60} r={r} fill="none" stroke="var(--surface-highest,#e5e7eb)" strokeWidth={9} />
      <circle cx={60} cy={60} r={r} fill="none" stroke={color}
        strokeWidth={9} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition:'stroke-dashoffset 1s ease' }} />
      <text x={60} y={50} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:'rotate(90deg)', transformOrigin:'60px 60px', fill:color, fontSize:22, fontWeight:900, fontFamily:'inherit' }}>
        {score}%
      </text>
      <text x={60} y={72} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:'rotate(90deg)', transformOrigin:'60px 60px', fill:'var(--text-3,#9ca3af)', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>
        {isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
      </text>
    </svg>
  )
}

const RESULT_CSS = `
  .result-toolbar {
    position: sticky; top: 0; z-index: 100;
    background: var(--surface,#fff); border-bottom: 1px solid var(--border,#e5e7eb);
    padding: 10px 16px;
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap; min-height: 54px;
  }
  .result-toolbar-title { flex: 1; min-width: 0; }
  .result-toolbar-title p:first-child {
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--primary,#0050cb); line-height: 1;
  }
  .result-toolbar-title p:last-child {
    font-size: 14px; font-weight: 700; color: var(--on-surface,#111);
    margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .result-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .result-content { max-width: 860px; margin: 0 auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 18px; -webkit-overflow-scrolling: touch; }
  .result-card {
    background: var(--surface,#fff); border-radius: 20px;
    border: 1px solid var(--border,#e5e7eb); padding: 20px;
  }
  .result-card-label {
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-3,#9ca3af); margin-bottom: 14px;
  }
  .answer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
  }
  @media (max-width: 480px) {
    .answer-grid { grid-template-columns: 1fr; }
    .result-content { padding: 14px 12px; gap: 14px; }
    .result-card { padding: 14px; }
    .result-toolbar { padding: 8px 12px; }
    .result-actions { gap: 6px; }
    .result-actions .rbtn { padding: 7px 12px; font-size: 12px; }
  }
  .rbtn {
    display: flex; align-items: center; gap: 5px;
    padding: 8px 14px; border-radius: 999px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    border: 1.5px solid var(--border,#e5e7eb);
    background: var(--surface,#fff); color: var(--text-2,#374151);
    transition: all 0.15s; white-space: nowrap;
  }
  .rbtn:hover { background: var(--surface-low,#f3f4f6); }
  .rbtn.primary {
    background: var(--primary,#0050cb); color: white;
    border-color: var(--primary,#0050cb);
    box-shadow: 0 3px 12px rgba(0,80,203,0.3);
  }
  .rbtn.primary:hover { opacity: 0.9; }
  .rbtn.primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .rbtn.saved { background: rgba(5,150,105,0.08); color: #059669; border-color: rgba(5,150,105,0.3); }
  .stat-pill {
    padding: 6px 14px; border-radius: 999px;
    display: flex; gap: 6px; align-items: center;
  }
`

export default function OMRResultClient({ exam, scanResult, onRescan, onClose, readOnly=false }: Props) {
  const supabase = createClient()

  const [studentName, setStudentName] = useState(scanResult.studentName)
  const [studentCode, setStudentCode] = useState(scanResult.studentCode)
  const [grade, setGrade]             = useState(scanResult.grade)
  const [sheetSerial, setSheetSerial] = useState(scanResult.sheetSerial ?? '')
  const [answers, setAnswers]         = useState<Record<number,number>>(scanResult.answers)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const { correct, wrong, blank, score } = calcScore(answers, exam.answer_keys, exam.num_questions)
  const isPassed = score >= exam.pass_score

  function setAnswer(qNum: number, opt: number) { setAnswers(p => ({ ...p, [qNum]: opt })); setSaved(false) }
  function clearAnswer(qNum: number) { setAnswers(p => { const n={...p}; delete n[qNum]; return n }); setSaved(false) }

  async function handleSave() {
    setSaving(true)
    const payload = {
      exam_id:      exam.id,
      student_name: studentName.trim() || null,
      student_code: studentCode.trim() || null,
      grade:        grade.trim() || null,
      sheet_serial: sheetSerial.trim() || null,
      answers, score, correct, wrong, blank, is_passed: isPassed,
      scanned_at: scanResult.scannedAt,
    }
    const { error } = await supabase.from('omr_results').insert(payload)
    setSaving(false)
    if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return }
    toast.success('บันทึกผลสำเร็จ ✓')
    setSaved(true)
  }

  return (
    <div style={{ fontFamily:'var(--font,system-ui)', minHeight:'100vh', background:'var(--surface-low,#f3f4f6)' }}>
      <style>{RESULT_CSS}</style>

      {/* Toolbar */}
      <div className="result-toolbar">
        <button className="rbtn" onClick={onClose} style={{ padding:'8px 12px' }}>
          <ArrowLeft size={14} /> ย้อนกลับ
        </button>
        <div className="result-toolbar-title">
          <p>ผลการตรวจ OMR</p>
          <p>{exam.title}</p>
        </div>

        {sheetSerial && (
          <div style={{
            padding:'4px 12px', borderRadius:999,
            background:'rgba(107,33,168,0.1)', border:'1px solid rgba(107,33,168,0.25)',
            fontFamily:'monospace', fontSize:12, fontWeight:800, color:'#6b21a8',
            letterSpacing:'0.06em', flexShrink:0,
          }}>#{sheetSerial}</div>
        )}

        <div className="result-actions">
          {!readOnly && (
            <button className="rbtn" onClick={onRescan}>
              <RotateCcw size={13} /> สแกนใหม่
            </button>
          )}
          {!readOnly && (
            <button
              className={`rbtn ${saved ? 'saved' : 'primary'}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving
                ? <><span style={{ width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'omr-spin 0.7s linear infinite',display:'inline-block' }} />บันทึก...</>
                : saved ? '✓ บันทึกแล้ว'
                : <><Save size={13} /> บันทึกผล</>}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes omr-spin { to { transform: rotate(360deg); } }`}</style>

      <div className="result-content">

        {/* Score Summary */}
        <div className="result-card" style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <ScoreRing score={score} pass={exam.pass_score} />
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              {isPassed
                ? <CheckCircle2 size={20} color="#059669" />
                : <XCircle size={20} color="#dc2626" />}
              <span style={{ fontSize:18, fontWeight:900, color:isPassed?'#059669':'#dc2626' }}>
                {isPassed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
              </span>
              <span style={{ fontSize:12, color:'var(--text-3,#9ca3af)', fontWeight:600 }}>(เกณฑ์ {exam.pass_score}%)</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { label:'ถูก',    value:correct,           color:'#059669', bg:'rgba(5,150,105,0.08)' },
                { label:'ผิด',    value:wrong,             color:'#dc2626', bg:'rgba(220,38,38,0.08)' },
                { label:'ไม่ตอบ', value:blank,             color:'#9ca3af', bg:'rgba(156,163,175,0.08)' },
                { label:'รวม',   value:exam.num_questions,  color:'#0050cb', bg:'rgba(0,80,203,0.06)' },
              ].map(s => (
                <div key={s.label} className="stat-pill" style={{ background:s.bg }}>
                  <span style={{ fontWeight:900, color:s.color, fontSize:16 }}>{s.value}</span>
                  <span style={{ fontSize:11, color:'var(--text-3,#9ca3af)', fontWeight:600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student info */}
        <div className="result-card">
          <p className="result-card-label">ข้อมูลนักเรียน</p>
          {readOnly ? (
            /* โหมดดูอย่างเดียว — แสดงข้อมูลที่บันทึกไว้ */
            <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              {[
                { label:'ชื่อ-นามสกุล', value:studentName || '—' },
                { label:'รหัสนักเรียน', value:studentCode || '—' },
                { label:'ชั้น/ห้อง',    value:grade || '—' },
                { label:'รหัสกระดาษ',   value:sheetSerial || '—' },
              ].map(f => (
                <div key={f.label} style={{ minWidth:140 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3,#9ca3af)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--on-surface,#111)', fontFamily: f.label==='รหัสกระดาษ'?'monospace':'inherit' }}>{f.value}</div>
                </div>
              ))}
            </div>
          ) : (
            /* โหมดแก้ไข */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
              {[
                { label:'ชื่อ-นามสกุล', value:studentName, set:setStudentName, placeholder:'ชื่อนักเรียน' },
                { label:'รหัสนักเรียน', value:studentCode, set:setStudentCode, placeholder:'รหัส' },
                { label:'ชั้น/ห้อง',    value:grade,        set:setGrade,        placeholder:'ม.2/1' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3,#9ca3af)', display:'block', marginBottom:4 }}>{f.label}</label>
                  <input className="input" value={f.value} onChange={e => { f.set(e.target.value); setSaved(false) }} placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3,#9ca3af)', display:'block', marginBottom:4 }}>
                  รหัสกระดาษ (Serial)
                  {sheetSerial && scanResult.sheetSerial && sheetSerial===scanResult.sheetSerial && (
                    <span style={{ marginLeft:6, fontSize:10, color:'#059669', fontWeight:700 }}>✓ สแกนอัตโนมัติ</span>
                  )}
                </label>
                <input
                  className="input"
                  value={sheetSerial}
                  onChange={e => { setSheetSerial(e.target.value.toUpperCase().trim()); setSaved(false) }}
                  placeholder="เช่น EX250001"
                  style={{ fontFamily:'monospace', letterSpacing:'0.06em' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Answer review */}
        <div className="result-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <p className="result-card-label" style={{ marginBottom:0 }}>ตรวจสอบคำตอบ</p>
            {!readOnly && <span style={{ fontSize:11, color:'var(--text-3,#9ca3af)' }}>คลิกเปลี่ยนคำตอบได้</span>}
          </div>
          <div className="answer-grid">
            {Array.from({ length:exam.num_questions }, (_, i) => {
              const qNum = i+1
              const key  = exam.answer_keys.find(k => k.questionNum === qNum)
              const studentAns = answers[qNum]
              const isBlank   = studentAns === undefined || studentAns < 0
              const isCorrect = !isBlank && key !== undefined && studentAns === key.correctOption
              const optCount  = exam.options_per_q

              const rowBg     = isBlank ? 'var(--surface-lowest,#f9fafb)' : isCorrect ? 'rgba(5,150,105,0.05)' : 'rgba(220,38,38,0.04)'
              const rowBorder = isBlank ? 'var(--border,#e5e7eb)'          : isCorrect ? 'rgba(5,150,105,0.28)' : 'rgba(220,38,38,0.24)'

              return (
                <div key={qNum} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'8px 12px', borderRadius:14,
                  border:`1.5px solid ${rowBorder}`, background:rowBg,
                }}>
                  <span style={{
                    width:24, height:24, borderRadius:'50%', fontSize:10, fontWeight:800,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    background: isBlank ? 'var(--surface-highest,#e5e7eb)' : isCorrect ? 'rgba(5,150,105,0.14)' : 'rgba(220,38,38,0.11)',
                    color: isBlank ? 'var(--text-3,#9ca3af)' : isCorrect ? '#059669' : '#dc2626',
                  }}>{qNum}</span>

                  <div style={{ display:'flex', gap:5, flex:1, flexWrap:'wrap' }}>
                    {Array.from({ length:optCount }, (_, oi) => {
                      const isSelected = studentAns === oi
                      const isAnswer   = key?.correctOption === oi
                      let bg='var(--surface,#fff)', border='var(--border,#e5e7eb)', color='var(--text-3,#9ca3af)'
                      if (isSelected && isAnswer)   { bg='#059669'; border='#059669'; color='white' }
                      else if (isSelected)           { bg='#dc2626'; border='#dc2626'; color='white' }
                      else if (isAnswer && !isBlank) { border='#059669'; color='#059669' }
                      return (
                        <button key={oi} onClick={() => readOnly ? null : (isSelected ? clearAnswer(qNum) : setAnswer(qNum, oi))} style={{
                          width:28, height:28, borderRadius:'50%', fontSize:10, fontWeight:800,
                          border:`2px solid ${border}`, background:bg, color,
                          cursor: readOnly ? 'default' : 'pointer', transition:'all 0.12s', flexShrink:0,
                        }}>{LABELS[oi]}</button>
                      )
                    })}
                  </div>

                  <span style={{ fontSize:15, flexShrink:0 }}>
                    {isBlank ? '—' : isCorrect ? '✓' : '✗'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom save */}
        {!readOnly && !saved && (
          <button className="rbtn primary" onClick={handleSave} disabled={saving} style={{ alignSelf:'flex-end', padding:'12px 28px', fontSize:14 }}>
            {saving
              ? <><span style={{ width:15,height:15,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'omr-spin 0.7s linear infinite',display:'inline-block' }} />กำลังบันทึก...</>
              : <><Save size={15} /> บันทึกผลการสอบ</>}
          </button>
        )}
        {!readOnly && saved && (
          <div className="rbtn saved" style={{ alignSelf:'flex-end', padding:'12px 28px', fontSize:14 }}>
            ✓ บันทึกแล้ว
          </div>
        )}
      </div>
    </div>
  )
}
