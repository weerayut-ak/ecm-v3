'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ArrowLeft, Save, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Question, QuizOption } from '@/types/quiz'

const supabase = createClient()

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuizForm {
  title: string
  description: string
  pass_score: number
  time_limit: number | string
  is_open: boolean
  opens_at: string
  closes_at: string
}

type Step = 'info' | 'questions'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddQuizClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('info')
  const [quizId, setQuizId] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<QuizForm>({
    title: '', description: '', pass_score: 60,
    time_limit: '', is_open: false, opens_at: '', closes_at: '',
  })

  async function handleSaveInfo() {
    if (!form.title.trim()) { toast.error('กรุณาใส่ชื่อแบบทดสอบ'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title,
      description: form.description || null,
      pass_score: Number(form.pass_score),
      time_limit: form.time_limit ? Number(form.time_limit) : null,
      is_open: form.is_open,
      opens_at: form.opens_at || null,
      closes_at: form.closes_at || null,
      created_by: user?.id,
    }
    const { data, error } = await supabase.from('quizzes').insert(payload).select().single()
    setSaving(false)
    if (error || !data) { toast.error('บันทึกไม่สำเร็จ: ' + error?.message); return }
    setQuizId(data.id)
    setQuizTitle(data.title)
    toast.success('สร้างแบบทดสอบแล้ว ✓')

    // 🔔 แจ้งเตือนนักเรียนทุกคนว่ามีแบบทดสอบใหม่
    try {
      const res = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_quiz',
          title: `แบบทดสอบใหม่: "${data.title}"`,
          body: data.description || 'มีแบบทดสอบใหม่รอคุณอยู่',
          link: `/dashboard/quizzes/${data.id}/terms`,
          metadata: { quiz_id: data.id },
          target_role: 'student',
        }),
      })
      const json = await res.json()
      if (!res.ok) console.error('[quiz noti] error:', json)
      else console.log('[quiz noti] sent:', json)
    } catch (e) {
      console.error('[quiz noti] fetch error:', e)
    }

    setStep('questions')
  }

  function handleDone() {
    router.push('/dashboard/admin/quizzes')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>

      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, height: 56, position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => step === 'questions' ? setStep('info') : router.push('/dashboard/admin/quizzes')}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> {step === 'questions' ? 'แก้ไขข้อมูล' : 'กลับ'}
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>สร้างแบบทดสอบใหม่</h1>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {(['info', 'questions'] as Step[]).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: step === s ? 'var(--blue)' : quizId && s === 'questions' ? 'var(--blue-light)' : 'var(--surface)',
                color: step === s ? 'white' : quizId && s === 'questions' ? 'var(--blue)' : 'var(--text-3)',
                border: '1px solid ' + (step === s ? 'var(--blue)' : 'var(--border)'),
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: step === s ? 'rgba(255,255,255,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{i + 1}</span>
                {s === 'info' ? 'ข้อมูลทั่วไป' : 'ข้อสอบ'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 24px' }}>

        {/* ── STEP 1: Info ── */}
        {step === 'info' && (
          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>ข้อมูลแบบทดสอบ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">ชื่อแบบทดสอบ *</label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="เช่น บทที่ 1 พืชและสัตว์" />
              </div>
              <div>
                <label className="form-label">คำอธิบาย</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">คะแนนผ่าน (%)</label>
                  <input type="number" min={0} max={100} className="input" value={form.pass_score} onChange={e => setForm(p => ({ ...p, pass_score: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-label">เวลา (นาที)</label>
                  <input type="number" min={0} className="input" value={form.time_limit} onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))} placeholder="ไม่จำกัด" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">วันเปิด</label>
                  <input type="datetime-local" className="input" value={form.opens_at} onChange={e => setForm(p => ({ ...p, opens_at: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">วันปิด</label>
                  <input type="datetime-local" className="input" value={form.closes_at} onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.is_open} onChange={e => setForm(p => ({ ...p, is_open: e.target.checked }))} />
                เปิดให้ทำแบบทดสอบทันที
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button className="btn" onClick={() => router.push('/dashboard/admin/quizzes')}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleSaveInfo} disabled={saving} style={{ gap: 6 }}>
                {saving ? <><div className="spinner" />บันทึก...</> : <>บันทึกและเพิ่มข้อสอบ <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Questions ── */}
        {step === 'questions' && quizId && (
          <QuestionManager quizId={quizId} quizTitle={quizTitle} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}

// ─── Question Manager ─────────────────────────────────────────────────────────
function QuestionManager({ quizId, quizTitle, onDone }: { quizId: string; quizTitle: string; onDone: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [addMode, setAddMode] = useState<'single' | 'bulk' | null>(null)
  const [bulkText, setBulkText] = useState('')

  function parseBulkMCQ(text: string): Partial<Question>[] {
    const blocks = text.trim().split(/\n{2,}/).filter(b => b.trim())
    return blocks.map((block, i) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      const question_text = lines[0].replace(/^\d+\.\s*/, '')
      const options: QuizOption[] = []
      let correct_answer = '0'
      lines.slice(1).forEach(line => {
        const m = line.match(/^([A-Da-d])[.)]\s*(.+)/)
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65
          options.push({ label: m[1].toUpperCase(), text: m[2].replace(/\*$/, '').trim() })
          if (line.includes('*')) correct_answer = String(idx)
        }
      })
      return { type: 'mcq' as const, question_text, options, correct_answer, sort_order: questions.length + i, quiz_id: quizId, points: 1 }
    }).filter(q => q.question_text && (q.options as QuizOption[])?.length > 0)
  }

  async function importBulk() {
    const parsed = parseBulkMCQ(bulkText)
    if (!parsed.length) { toast.error('ไม่พบข้อสอบที่ถูกรูปแบบ'); return }
    const { data, error } = await supabase.from('questions').insert(parsed).select()
    if (error) { toast.error('นำเข้าไม่สำเร็จ: ' + error.message); return }
    setQuestions(p => [...p, ...(data ?? [])])
    setBulkText('')
    setAddMode(null)
    toast.success(`นำเข้า ${data?.length} ข้อ ✓`)
  }

  async function deleteQ(id: string) {
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(p => p.filter(q => q.id !== id))
    toast.success('ลบแล้ว')
  }

  const parsedCount = bulkText.trim() ? parseBulkMCQ(bulkText).length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header card */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{quizTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{questions.length} ข้อ</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${addMode === 'single' ? 'btn-primary' : ''}`}
            onClick={() => setAddMode(addMode === 'single' ? null : 'single')}>
            <Plus size={13} /> เพิ่ม 1 ข้อ
          </button>
          <button className={`btn btn-sm ${addMode === 'bulk' ? 'btn-primary' : ''}`}
            onClick={() => setAddMode(addMode === 'bulk' ? null : 'bulk')}>
            📋 วางหลายข้อ
          </button>
          <button className="btn btn-primary btn-sm" onClick={onDone} style={{ gap: 5 }}>
            <Save size={13} /> เสร็จสิ้น
          </button>
        </div>
      </div>

      {/* Single add form */}
      {addMode === 'single' && (
        <div className="card" style={{ padding: 20 }}>
          <AddQuestionForm
            quizId={quizId}
            sortOrder={questions.length}
            onSaved={q => { setQuestions(p => [...p, q]); setAddMode(null) }}
            onSavedAndContinue={q => setQuestions(p => [...p, q])}
            onCancel={() => setAddMode(null)}
          />
        </div>
      )}

      {/* Bulk import */}
      {addMode === 'bulk' && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📋 วางข้อสอบปรนัยหลายข้อ</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>แต่ละข้อคั่นด้วยบรรทัดว่าง ใส่ <strong>*</strong> หลังตัวเลือกที่ถูกต้อง</p>
          <textarea className="input" rows={12} value={bulkText} onChange={e => setBulkText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical', marginBottom: 10 }}
            placeholder={"1. คำถามข้อ 1\nA. ตัวเลือก A\nB. ตัวเลือก B*\nC. ตัวเลือก C\nD. ตัวเลือก D\n\n2. คำถามข้อ 2\n..."} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>ตรวจพบ {parsedCount} ข้อ</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setAddMode(null)}>ยกเลิก</button>
              <button className="btn btn-primary btn-sm" onClick={importBulk} disabled={!bulkText.trim() || parsedCount === 0}>
                นำเข้า {parsedCount} ข้อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
            <p style={{ fontSize: 13 }}>ยังไม่มีข้อสอบ — เพิ่มข้อสอบด้านบน</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: q.type === 'mcq' ? 'var(--blue-light)' : q.type === 'fill' ? 'var(--green-light)' : 'var(--amber-light)', color: q.type === 'mcq' ? 'var(--blue)' : q.type === 'fill' ? 'var(--green)' : 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 6 }}>{q.question_text}</p>
                  {q.type === 'mcq' && q.options && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(q.options as QuizOption[]).map((opt, oi) => (
                        <span key={oi} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6,
                          background: String(oi) === String(q.correct_answer) ? 'var(--green-light)' : 'rgba(0,0,0,0.04)',
                          color: String(oi) === String(q.correct_answer) ? 'var(--green)' : 'var(--text-3)',
                          fontWeight: String(oi) === String(q.correct_answer) ? 700 : 400 }}>
                          {opt.label}. {opt.text}{String(oi) === String(q.correct_answer) ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <span className={`badge ${q.type === 'mcq' ? 'badge-blue' : q.type === 'fill' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                      {q.type === 'mcq' ? 'ปรนัย' : q.type === 'fill' ? 'เติมคำ' : 'อัตนัย'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{q.points} คะแนน</span>
                  </div>
                </div>
                <button className="btn btn-sm btn-danger" style={{ flexShrink: 0 }} onClick={() => deleteQ(q.id)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom done button */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onDone} style={{ gap: 6 }}>
            <Save size={14} /> เสร็จสิ้น ({questions.length} ข้อ)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Add Question Form ────────────────────────────────────────────────────────
function AddQuestionForm({ quizId, sortOrder, onSaved, onSavedAndContinue, onCancel }: {
  quizId: string; sortOrder: number
  onSaved: (q: Question) => void
  onSavedAndContinue: (q: Question) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<'mcq' | 'fill' | 'essay'>('mcq')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState([
    { label: 'A', text: '' }, { label: 'B', text: '' },
    { label: 'C', text: '' }, { label: 'D', text: '' },
  ])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [fillAnswer, setFillAnswer] = useState('')
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)

  function reset() {
    setQuestionText('')
    setOptions([{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }])
    setCorrectIndex(0)
    setFillAnswer('')
  }

  async function save(andContinue = false) {
    if (!questionText.trim()) { toast.error('กรุณาใส่คำถาม'); return }
    if (type === 'mcq' && options.some(o => !o.text.trim())) { toast.error('กรุณาใส่ตัวเลือกให้ครบ'); return }
    setSaving(true)
    const payload: Partial<Question> = {
      quiz_id: quizId, type, question_text: questionText,
      options: type === 'mcq' ? options : null,
      correct_answer: type === 'mcq' ? String(correctIndex) : type === 'fill' ? fillAnswer : null,
      points, sort_order: sortOrder,
    }
    const { data, error } = await supabase.from('questions').insert(payload).select().single()
    setSaving(false)
    if (error || !data) { toast.error('เพิ่มไม่สำเร็จ: ' + error?.message); return }
    toast.success('เพิ่มข้อสอบแล้ว ✓')
    if (andContinue) { onSavedAndContinue(data); reset() }
    else onSaved(data)
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>เพิ่มข้อสอบใหม่</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {(['mcq', 'fill', 'essay'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-sm ${type === t ? 'btn-primary' : ''}`} style={{ justifyContent: 'center' }}>
            {t === 'mcq' ? 'ปรนัย' : t === 'fill' ? 'เติมคำ' : 'อัตนัย'}
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} placeholder="คำถาม..." value={questionText}
        onChange={e => setQuestionText(e.target.value)} style={{ marginBottom: 12, resize: 'vertical' }} />
      {type === 'mcq' && options.map((opt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
          <span style={{ fontSize: 12, fontWeight: 700, width: 20 }}>{opt.label}.</span>
          <input className="input" style={{ fontSize: 13 }} value={opt.text}
            onChange={e => setOptions(p => p.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
            placeholder={`ตัวเลือก ${opt.label}`} />
        </div>
      ))}
      {type === 'fill' && (
        <input className="input" style={{ marginBottom: 12 }} placeholder="คำตอบที่ถูกต้อง..."
          value={fillAnswer} onChange={e => setFillAnswer(e.target.value)} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>คะแนน:</label>
        <input type="number" min={1} className="input" style={{ width: 70 }} value={points}
          onChange={e => setPoints(Number(e.target.value))} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={onCancel}>ยกเลิก</button>
        <button className="btn btn-primary btn-sm" onClick={() => save(false)} disabled={saving}>
          {saving ? 'บันทึก...' : 'บันทึก'}
        </button>
        <button className="btn btn-sm" style={{ background: 'rgba(0,80,203,0.1)', color: 'var(--blue)', fontWeight: 700 }}
          onClick={() => save(true)} disabled={saving}>
          <Plus size={11} /> บันทึก & เพิ่มข้อต่อไป
        </button>
      </div>
    </div>
  )
}