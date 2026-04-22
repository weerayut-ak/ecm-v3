"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Clock, ToggleLeft, ToggleRight, Edit2, Trash2, Users, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import toast from "react-hot-toast"
import type { Quiz, Question, QuizOption } from "@/types/quiz"

interface QuizRow extends Omit<Quiz, 'questions'> { questions: { count: number }[] }

interface Session {
  id: string
  student_id: string
  quiz_id: string
  leave_count: number
  status: string
  last_seen: string
  reset_at: string | null
  student: { full_name: string; nickname: string | null; grade: string | null; student_id: string | null } | null
}

export default function AdminQuizzesClient({ quizzes: init }: { quizzes: QuizRow[] }) {
  const [quizzes, setQuizzes] = useState(init)
  const [modal, setModal] = useState<{ mode: "add" | "edit"; quiz?: QuizRow } | null>(null)
  const [qModal, setQModal] = useState<{ quizId: string; quizTitle: string } | null>(null)
  const [violationsModal, setViolationsModal] = useState<{ quizId: string; quizTitle: string } | null>(null)
  const supabase = createClient()

  async function toggleOpen(quiz: QuizRow) {
    await supabase.from("quizzes").update({ is_open: !quiz.is_open }).eq("id", quiz.id)
    setQuizzes(p => p.map(q => q.id === quiz.id ? { ...q, is_open: !quiz.is_open } : q))
    toast.success(quiz.is_open ? "ปิดแล้ว" : "เปิดแล้ว")
  }

  async function deleteQuiz(id: string) {
    if (!confirm("ยืนยันการลบ?")) return
    await supabase.from("quizzes").delete().eq("id", id)
    setQuizzes(p => p.filter(q => q.id !== id))
    toast.success("ลบแล้ว")
  }

  async function onSaved(quiz: QuizRow) {
    if (modal?.mode === "add") setQuizzes(p => [quiz, ...p])
    else setQuizzes(p => p.map(q => q.id === quiz.id ? quiz : q))
    setModal(null)
    toast.success("บันทึกแล้ว ✓")
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700 }}>จัดการแบบทดสอบ</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{quizzes.length} ชุด</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "add" })}>
          <Plus size={14} /> สร้างแบบทดสอบ
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {quizzes.map(q => (
          <div key={q.id} className="card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>{q.title}</h3>
                  <span className={`badge ${q.is_open ? "badge-green" : "badge-red"}`}>{q.is_open ? "เปิด" : "ปิด"}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <span>📝 {q.questions?.[0]?.count ?? 0} ข้อ</span>
                  <span>🎯 ผ่าน {q.pass_score}%</span>
                  {q.time_limit && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> {q.time_limit} นาที</span>}
                  {q.opens_at && <span>📅 {new Date(q.opens_at).toLocaleDateString("th-TH")} – {new Date(q.closes_at!).toLocaleDateString("th-TH")}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => toggleOpen(q)} style={{ color: q.is_open ? "var(--green)" : "var(--text-3)" }}>
                  {q.is_open ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {q.is_open ? "ปิด" : "เปิด"}
                </button>
                <button className="btn btn-sm" onClick={() => setQModal({ quizId: q.id, quizTitle: q.title })}>
                  <Edit2 size={12} /> ข้อสอบ
                </button>
                <button className="btn btn-sm" onClick={() => setViolationsModal({ quizId: q.id, quizTitle: q.title })} style={{ color: 'var(--amber)' }}>
                  <AlertTriangle size={12} /> ออกกลางคัน
                </button>
                <button className="btn btn-sm" onClick={() => setModal({ mode: "edit", quiz: q })}>แก้ไข</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteQuiz(q.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && <QuizFormModal mode={modal.mode} quiz={modal.quiz} onClose={() => setModal(null)} onSaved={onSaved} />}
      {qModal && <QuestionManagerModal quizId={qModal.quizId} quizTitle={qModal.quizTitle} onClose={() => setQModal(null)} />}
      {violationsModal && <ViolationsModal quizId={violationsModal.quizId} quizTitle={violationsModal.quizTitle} onClose={() => setViolationsModal(null)} />}
    </div>
  )
}

// =============================================
// VIOLATIONS MODAL
// =============================================
function ViolationsModal({ quizId, quizTitle, onClose }: { quizId: string; quizTitle: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*, student:profiles(full_name, nickname, grade, student_id)')
      .eq('quiz_id', quizId)
      .gt('leave_count', 0)
      .order('leave_count', { ascending: false })
    setSessions((data as Session[]) ?? [])
    setLoading(false)
  }

  async function resetStudent(session: Session) {
    if (!confirm(`อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name} ทำแบบทดสอบอีกครั้ง?`)) return
    setResetting(session.id)
    const { data: { user } } = await supabase.auth.getUser()

    // Reset session
    const { error: se } = await supabase.from('quiz_sessions').update({
      leave_count: 0,
      status: 'active',
      reset_by: user?.id,
      reset_at: new Date().toISOString(),
    }).eq('id', session.id)

    // Delete submission so they can retry
    const { error: de } = await supabase.from('submissions')
      .delete()
      .eq('quiz_id', quizId)
      .eq('student_id', session.student_id)

    if (se || de) {
      toast.error('รีเซ็ตไม่สำเร็จ')
    } else {
      toast.success(`อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name} ทำซ้ำแล้ว ✓`)
      setSessions(p => p.map(s => s.id === session.id ? { ...s, leave_count: 0, status: 'active', reset_at: new Date().toISOString() } : s))
    }
    setResetting(null)
  }

  const blocked = sessions.filter(s => s.status === 'blocked' || s.leave_count >= 3)
  const warned = sessions.filter(s => s.status !== 'blocked' && s.leave_count < 3)

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>การออกกลางคัน</h3>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{quizTitle}</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <p style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>กำลังโหลด...</p>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-3)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 13 }}>ไม่มีนักเรียนที่ออกกลางคัน</p>
            </div>
          ) : (
            <>
              {blocked.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> ถูกล็อค ({blocked.length} คน)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {blocked.map(s => (
                      <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />
                    ))}
                  </div>
                </div>
              )}
              {warned.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> มีประวัติออก ({warned.length} คน)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {warned.map(s => (
                      <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function SessionRow({ session, onReset, resetting }: { session: Session; onReset: (s: Session) => void; resetting: boolean }) {
  const isBlocked = session.status === 'blocked' || session.leave_count >= 3
  const name = session.student?.nickname ?? session.student?.full_name ?? '-'

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${isBlocked ? 'rgba(220,38,38,0.3)' : 'rgba(217,119,6,0.3)'}`, background: isBlocked ? 'var(--red-light)' : 'var(--amber-light)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 13 }}>{name}
          {session.student?.grade && <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6, fontWeight: 400 }}>{session.student.grade}</span>}
        </p>
        {session.student?.student_id && <p style={{ fontSize: 11, color: "var(--text-3)" }}>รหัส {session.student.student_id}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: isBlocked ? 'var(--red)' : 'var(--amber)' }}>{session.leave_count}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)" }}>ครั้ง</div>
        </div>
        <span className={`badge ${isBlocked ? 'badge-red' : 'badge-amber'}`}>
          {isBlocked ? '🚫 ล็อค' : '⚠️ เตือน'}
        </span>
        {session.reset_at ? (
          <span className="badge badge-green" style={{ fontSize: 10 }}>✓ รีเซ็ตแล้ว</span>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={() => onReset(session)} disabled={resetting} style={{ fontSize: 11 }}>
            {resetting ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <><RefreshCw size={11} /> อนุญาต</>}
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================
// QUIZ FORM MODAL
// =============================================
function QuizFormModal({ mode, quiz, onClose, onSaved }: { mode: "add" | "edit"; quiz?: QuizRow; onClose: () => void; onSaved: (q: QuizRow) => void }) {
  const [form, setForm] = useState({
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    pass_score: quiz?.pass_score ?? 60,
    time_limit: quiz?.time_limit ?? "" as number | string,
    is_open: quiz?.is_open ?? false,
    opens_at: quiz?.opens_at ? quiz.opens_at.slice(0, 16) : "",
    closes_at: quiz?.closes_at ? quiz.closes_at.slice(0, 16) : "",
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    if (!form.title.trim()) { toast.error("กรุณาใส่ชื่อ"); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title, description: form.description || null,
      pass_score: Number(form.pass_score),
      time_limit: form.time_limit ? Number(form.time_limit) : null,
      is_open: form.is_open,
      opens_at: form.opens_at || null, closes_at: form.closes_at || null,
      created_by: user?.id,
    }
    let data, error
    if (mode === "add") {
      ;({ data, error } = await supabase.from("quizzes").insert(payload).select("*, questions(count)").single())
    } else {
      ;({ data, error } = await supabase.from("quizzes").update(payload).eq("id", quiz!.id).select("*, questions(count)").single())
    }
    if (error || !data) { toast.error("บันทึกไม่สำเร็จ"); setSaving(false); return }
    onSaved(data); setSaving(false)
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 9999, padding: "24px 16px", overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>{mode === "add" ? "สร้างแบบทดสอบ" : "แก้ไขแบบทดสอบ"}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label className="form-label">ชื่อแบบทดสอบ *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="form-label">คำอธิบาย</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: "vertical" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="form-label">คะแนนผ่าน (%)</label><input type="number" min={0} max={100} className="input" value={form.pass_score} onChange={e => setForm(p => ({ ...p, pass_score: Number(e.target.value) }))} /></div>
            <div><label className="form-label">เวลา (นาที)</label><input type="number" min={0} className="input" value={form.time_limit} onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))} placeholder="ไม่จำกัด" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="form-label">วันเปิด</label><input type="datetime-local" className="input" value={form.opens_at} onChange={e => setForm(p => ({ ...p, opens_at: e.target.value }))} /></div>
            <div><label className="form-label">วันปิด</label><input type="datetime-local" className="input" value={form.closes_at} onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))} /></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={form.is_open} onChange={e => setForm(p => ({ ...p, is_open: e.target.checked }))} />
            เปิดให้ทำแบบทดสอบทันที
          </label>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><div className="spinner" />บันทึก...</> : "บันทึก"}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// =============================================
// QUESTION MANAGER MODAL
// =============================================
function QuestionManagerModal({ quizId, quizTitle, onClose }: { quizId: string; quizTitle: string; onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'single' | 'bulk'>('list')
  const [bulkText, setBulkText] = useState("")
  const supabase = createClient()

  useEffect(() => {
    supabase.from("questions").select("*").eq("quiz_id", quizId).order("sort_order").then(({ data }) => {
      setQuestions(data ?? [])
      setLoading(false)
    })
  }, [])

  async function deleteQ(id: string) {
    await supabase.from("questions").delete().eq("id", id)
    setQuestions(p => p.filter(q => q.id !== id))
    toast.success("ลบแล้ว")
  }

  function parseBulkMCQ(text: string): Partial<Question>[] {
    const blocks = text.trim().split(/\n{2,}/).filter(b => b.trim())
    return blocks.map((block, i) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
      const question_text = lines[0].replace(/^\d+\.\s*/, "")
      const options: QuizOption[] = []
      let correct_answer = "0"
      lines.slice(1).forEach(line => {
        const m = line.match(/^([A-Da-d])[.)]\s*(.+)/)
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65
          options.push({ label: m[1].toUpperCase(), text: m[2].replace(/\*$/, "").trim() })
          if (line.includes("*")) correct_answer = String(idx)
        }
      })
      return { type: "mcq" as const, question_text, options, correct_answer, sort_order: questions.length + i, quiz_id: quizId, points: 1 }
    }).filter(q => q.question_text && (q.options as QuizOption[])?.length > 0)
  }

  async function importBulk() {
    const parsed = parseBulkMCQ(bulkText)
    if (!parsed.length) { toast.error("ไม่พบข้อสอบที่ถูกรูปแบบ"); return }
    const { data, error } = await supabase.from("questions").insert(parsed).select()
    if (error) { toast.error("นำเข้าไม่สำเร็จ: " + error.message); return }
    setQuestions(p => [...p, ...(data ?? [])])
    setBulkText(""); setMode('list')
    toast.success(`นำเข้า ${data?.length} ข้อ ✓`)
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>จัดการข้อสอบ</h3>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{quizTitle} · {questions.length} ข้อ</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button className={`btn btn-sm ${mode === 'single' ? 'btn-primary' : ''}`} onClick={() => setMode(mode === 'single' ? 'list' : 'single')}>
            <Plus size={12} /> เพิ่ม 1 ข้อ
          </button>
          <button className={`btn btn-sm ${mode === 'bulk' ? 'btn-primary' : ''}`} onClick={() => setMode(mode === 'bulk' ? 'list' : 'bulk')}>
            📋 วางหลายข้อ (Bulk)
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {/* Single add form */}
          {mode === 'single' && (
            <AddQuestionForm
              quizId={quizId}
              sortOrder={questions.length}
              onSaved={q => { setQuestions(p => [...p, q]); setMode('list') }}
              onCancel={() => setMode('list')}
            />
          )}

          {/* Bulk import */}
          {mode === 'bulk' && (
            <div style={{ background: "var(--blue-light)", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid rgba(37,99,235,0.2)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📋 วางข้อสอบปรนัยหลายข้อ</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>แต่ละข้อคั่นด้วยบรรทัดว่าง ใส่ <strong>*</strong> หลังตัวเลือกที่ถูกต้อง</p>
              <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.7 }}>
                {'1. She ___ to school.\nA. go\nB. goes*\nC. going\nD. gone\n\n2. They ___ friends.\nA. is\nB. am\nC. are*\nD. be'}
              </div>
              <textarea
                className="input"
                rows={10}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical", marginBottom: 10 }}
                placeholder={"1. คำถามข้อ 1\nA. ตัวเลือก A\nB. ตัวเลือก B*\nC. ตัวเลือก C\nD. ตัวเลือก D\n\n2. คำถามข้อ 2\n..."}
              />
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>
                ตรวจพบ {parseBulkMCQ(bulkText).length} ข้อ
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setMode('list')}>ยกเลิก</button>
                <button className="btn btn-primary btn-sm" onClick={importBulk} disabled={!bulkText.trim()}>
                  นำเข้า {parseBulkMCQ(bulkText).length} ข้อ
                </button>
              </div>
            </div>
          )}

          {/* Question list */}
          {loading ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>กำลังโหลด...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.length === 0 && mode === 'list' && (
                <p style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>ยังไม่มีข้อสอบ — คลิก "เพิ่ม 1 ข้อ" หรือ "วางหลายข้อ"</p>
              )}
              {questions.map((q, i) => (
                <div key={q.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: q.type === "mcq" ? "var(--blue-light)" : q.type === "fill" ? "var(--green-light)" : "var(--amber-light)", color: q.type === "mcq" ? "var(--blue)" : q.type === "fill" ? "var(--green)" : "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, wordBreak: 'break-word' }}>{q.question_text}</p>
                    {q.type === 'mcq' && q.options && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(q.options as QuizOption[]).map((opt, oi) => (
                          <span key={oi} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: String(oi) === String(q.correct_answer) ? 'var(--green-light)' : 'rgba(0,0,0,0.04)', color: String(oi) === String(q.correct_answer) ? 'var(--green)' : 'var(--text-3)', fontWeight: String(oi) === String(q.correct_answer) ? 700 : 400, border: String(oi) === String(q.correct_answer) ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent' }}>
                            {opt.label}. {opt.text}{String(oi) === String(q.correct_answer) ? ' ✓' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${q.type === "mcq" ? "badge-blue" : q.type === "fill" ? "badge-green" : "badge-amber"}`} style={{ fontSize: 10 }}>
                        {q.type === "mcq" ? "ปรนัย" : q.type === "fill" ? "เติมคำ" : "อัตนัย"}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{q.points} คะแนน</span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" style={{ flexShrink: 0 }} onClick={() => deleteQ(q.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// =============================================
// ADD SINGLE QUESTION FORM
// =============================================
function AddQuestionForm({ quizId, sortOrder, onSaved, onCancel }: { quizId: string; sortOrder: number; onSaved: (q: Question) => void; onCancel: () => void }) {
  const [type, setType] = useState<"mcq" | "fill" | "essay">("mcq")
  const [questionText, setQuestionText] = useState("")
  const [options, setOptions] = useState([{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [fillAnswer, setFillAnswer] = useState("")
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)
  const [addAnother, setAddAnother] = useState(false)
  const supabase = createClient()

  async function save(andContinue = false) {
    if (!questionText.trim()) { toast.error("กรุณาใส่คำถาม"); return }
    if (type === 'mcq' && options.some(o => !o.text.trim())) { toast.error("กรุณาใส่ตัวเลือกให้ครบ"); return }
    setSaving(true)
    const payload: Partial<Question> = {
      quiz_id: quizId, type, question_text: questionText,
      options: type === "mcq" ? options : null,
      correct_answer: type === "mcq" ? String(correctIndex) : type === "fill" ? fillAnswer : null,
      points, sort_order: sortOrder,
    }
    const { data, error } = await supabase.from("questions").insert(payload).select().single()
    if (error || !data) { toast.error("เพิ่มไม่สำเร็จ: " + error?.message); setSaving(false); return }
    toast.success("เพิ่มข้อสอบแล้ว ✓")
    onSaved(data)
    if (andContinue) {
      setQuestionText(""); setOptions([{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }]); setCorrectIndex(0); setFillAnswer("")
      setSaving(false)
    } else {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: "var(--blue-light)", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid rgba(37,99,235,0.2)" }}>
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>เพิ่มข้อสอบใหม่</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10 }}>
        {(["mcq", "fill", "essay"] as const).map(t => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-sm ${type === t ? "btn-primary" : ""}`} style={{ justifyContent: "center" }}>
            {t === "mcq" ? "ปรนัย" : t === "fill" ? "เติมคำ" : "อัตนัย"}
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} placeholder="คำถาม..." value={questionText} onChange={e => setQuestionText(e.target.value)} style={{ marginBottom: 10, resize: "vertical" }} />
      {type === "mcq" && options.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
          <span style={{ fontSize: 12, fontWeight: 700, width: 20 }}>{opt.label}.</span>
          <input className="input" style={{ fontSize: 13 }} value={opt.text} onChange={e => setOptions(p => p.map((o, j) => j === i ? { ...o, text: e.target.value } : o))} placeholder={`ตัวเลือก ${opt.label}`} />
        </div>
      ))}
      {type === "fill" && <input className="input" style={{ marginBottom: 10 }} placeholder="คำตอบที่ถูกต้อง..." value={fillAnswer} onChange={e => setFillAnswer(e.target.value)} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "var(--text-2)" }}>คะแนน:</label>
        <input type="number" min={1} className="input" style={{ width: 70 }} value={points} onChange={e => setPoints(Number(e.target.value))} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={onCancel}>ยกเลิก</button>
        <button className="btn btn-primary btn-sm" onClick={() => save(false)} disabled={saving}>
          {saving ? "บันทึก..." : "บันทึก"}
        </button>
        <button className="btn btn-sm" style={{ background: 'rgba(0,80,203,0.15)', color: 'var(--blue)', fontWeight: 700 }} onClick={() => save(true)} disabled={saving}>
          <Plus size={11} /> บันทึก & เพิ่มข้อต่อไป
        </button>
      </div>
    </div>
  )
}
