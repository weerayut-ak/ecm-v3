"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  Plus, X, Clock, ToggleLeft, ToggleRight, Edit2, Trash2,
  AlertTriangle, RefreshCw, BookOpen, Eye, LayoutGrid,
  CheckCircle2, TrendingUp,
} from "lucide-react"
import toast from "react-hot-toast"
import type { Quiz } from "@/types/quiz"

interface QuizRow extends Omit<Quiz, "questions"> {
  questions: { count: number }[]
}

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

const GRADES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3']
const GRADE_GROUPS = [
  { label: 'ม.1', grades: ['ม.1/1','ม.1/2','ม.1/3'] },
  { label: 'ม.2', grades: ['ม.2/1','ม.2/2','ม.2/3'] },
  { label: 'ม.3', grades: ['ม.3/1','ม.3/2','ม.3/3'] },
]

const EMPTY_FORM = {
  title: "", description: "", pass_score: 60,
  time_limit: "" as number | string,
  is_open: false, opens_at: "", closes_at: "",
  grade_filter: [] as string[],
}

export default function AdminQuizzesClient({ quizzes: init }: { quizzes: QuizRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [quizzes, setQuizzes]           = useState(init)
  const [editingQuiz, setEditingQuiz]   = useState<QuizRow | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [formOpen, setFormOpen]         = useState(false) // mobile toggle
  const [violationsModal, setViolationsModal] = useState<{ quizId: string; quizTitle: string } | null>(null)

  useEffect(() => {
    if (editingQuiz) {
      setForm({
        title: editingQuiz.title ?? "",
        description: editingQuiz.description ?? "",
        pass_score: editingQuiz.pass_score ?? 60,
        time_limit: editingQuiz.time_limit ?? "",
        is_open: editingQuiz.is_open ?? false,
        opens_at: editingQuiz.opens_at ? editingQuiz.opens_at.slice(0, 16) : "",
        closes_at: editingQuiz.closes_at ? editingQuiz.closes_at.slice(0, 16) : "",
        grade_filter: (editingQuiz as any).grade_filter ?? [],
      })
      setFormOpen(true)
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editingQuiz])

  const totalQuizzes   = quizzes.length
  const openQuizzes    = quizzes.filter(q => q.is_open).length
  const totalQuestions = quizzes.reduce((s, q) => s + (q.questions?.[0]?.count ?? 0), 0)

  async function toggleOpen(quiz: QuizRow) {
    await supabase.from("quizzes").update({ is_open: !quiz.is_open }).eq("id", quiz.id)
    setQuizzes(p => p.map(q => q.id === quiz.id ? { ...q, is_open: !quiz.is_open } : q))
    toast.success(quiz.is_open ? "ปิดแล้ว" : "เปิดแล้ว")
  }

  async function deleteQuiz(id: string) {
    if (!confirm("ยืนยันการลบ?")) return
    await supabase.from("quizzes").delete().eq("id", id)
    setQuizzes(p => p.filter(q => q.id !== id))
    if (editingQuiz?.id === id) handleCancel()
    toast.success("ลบแล้ว")
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("กรุณาใส่ชื่อ"); return }
    setSaving(true)
    const payload = {
      title: form.title, description: form.description || null,
      pass_score: Number(form.pass_score),
      time_limit: form.time_limit ? Number(form.time_limit) : null,
      is_open: form.is_open,
      opens_at: form.opens_at || null, closes_at: form.closes_at || null,
      grade_filter: form.grade_filter.length > 0 ? form.grade_filter : null,
    }
    if (editingQuiz) {
      const { data, error } = await supabase.from("quizzes").update(payload).eq("id", editingQuiz.id).select("*, questions(count)").single()
      if (error || !data) { toast.error("บันทึกไม่สำเร็จ"); setSaving(false); return }
      setQuizzes(p => p.map(q => q.id === data.id ? data : q))
      setEditingQuiz(null); setFormOpen(false)
      toast.success("บันทึกแล้ว ✓")
    } else {
      const { data, error } = await supabase.from("quizzes").insert(payload).select("*, questions(count)").single()
      if (error || !data) { toast.error("สร้างไม่สำเร็จ"); setSaving(false); return }
      setQuizzes(p => [data, ...p])
      setForm(EMPTY_FORM); setFormOpen(false)
      toast.success("สร้างแบบทดสอบแล้ว ✓")

      // 🔔 แจ้งเตือนนักเรียนทุกคน
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
            grade_filter: form.grade_filter.length > 0 ? form.grade_filter : null,
          }),
        })
        const json = await res.json()
        if (!res.ok) console.error('[quiz noti] error:', json)
        else console.log('[quiz noti] sent:', json)
      } catch (e) { console.error('[quiz noti] fetch error:', e) }
    }
    setSaving(false)
  }

  function handleCancel() {
    setEditingQuiz(null); setForm(EMPTY_FORM); setFormOpen(false)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-4 py-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">จัดการแบบทดสอบ</h1>
          <p className="text-xs text-gray-400 mt-0.5">ระบบสร้างและบริหารข้อสอบออนไลน์</p>
        </div>
        {/* Mobile create button */}
        <button
          className="btn btn-sm btn-primary flex items-center gap-1 rounded lg:hidden"
          onClick={() => { setEditingQuiz(null); setForm(EMPTY_FORM); setFormOpen(p => !p) }}
        >
          <Plus size={13} /> สร้าง
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <StatCard icon={<LayoutGrid size={14} />} label="ชุดข้อสอบ" value={totalQuizzes} cls="text-blue-600 bg-blue-50" />
        <StatCard icon={<CheckCircle2 size={14} />} label="เปิดอยู่" value={openQuizzes} cls="text-green-600 bg-green-50" />
        <StatCard icon={<TrendingUp size={14} />} label="ข้อทั้งหมด" value={totalQuestions} cls="text-amber-600 bg-amber-50" />
      </div>

      {/* ── Mobile: collapsible form ── */}
      {formOpen && (
        <div className="lg:hidden mb-4 border rounded overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-bold">{editingQuiz ? "✏️ แก้ไขแบบทดสอบ" : "➕ สร้างแบบทดสอบ"}</p>
            <button className="btn btn-icon btn-ghost rounded" onClick={handleCancel}><X size={14} /></button>
          </div>
          <div className="p-4">
            <QuizForm form={form} setForm={setForm} saving={saving} editingQuiz={editingQuiz} onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      )}

      {/* ── Desktop: 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">

        {/* LEFT: sticky form — desktop only */}
        <div className="hidden lg:block sticky top-6">
          <div className="card rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold">{editingQuiz ? "✏️ แก้ไขแบบทดสอบ" : "➕ สร้างแบบทดสอบใหม่"}</h2>
                {editingQuiz && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{editingQuiz.title}</p>}
              </div>
              {editingQuiz && (
                <button className="btn btn-icon btn-ghost rounded" onClick={handleCancel}><X size={14} /></button>
              )}
            </div>
            <QuizForm form={form} setForm={setForm} saving={saving} editingQuiz={editingQuiz} onSave={handleSave} onCancel={handleCancel} />
          </div>

          <div className="mt-2.5 p-3 rounded text-[11px] text-gray-500 leading-relaxed bg-blue-50 border border-blue-200">
            <p className="font-semibold text-blue-600 mb-1">💡 วิธีใช้</p>
            <p>กด <strong>แก้ไข</strong> ในรายการด้านขวา เพื่อโหลดข้อมูลมาแก้ไขในฟอร์มนี้</p>
          </div>
        </div>

        {/* RIGHT: quiz list */}
        <div>
          <h2 className="text-sm font-bold mb-3 text-gray-500">รายการแบบทดสอบ ({quizzes.length})</h2>
          {quizzes.length === 0 ? (
            <div className="card rounded text-center py-12 px-5 text-gray-400">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">ยังไม่มีแบบทดสอบ</p>
              <p className="text-xs mt-1">กด <strong>สร้าง</strong> เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {quizzes.map(q => (
                <QuizCard
                  key={q.id} quiz={q}
                  isEditing={editingQuiz?.id === q.id}
                  onToggleOpen={() => toggleOpen(q)}
                  onEdit={() => setEditingQuiz(q)}
                  onManage={() => router.push(`/dashboard/admin/quizzes/${q.id}/questions`)}
                  onPreview={() => router.push(`/dashboard/admin/quizzes/${q.id}/preview`)}
                  onViolations={() => setViolationsModal({ quizId: q.id, quizTitle: q.title })}
                  onDelete={() => deleteQuiz(q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {violationsModal && (
        <ViolationsModal
          quizId={violationsModal.quizId}
          quizTitle={violationsModal.quizTitle}
          onClose={() => setViolationsModal(null)}
        />
      )}
    </div>
  )
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: number; cls: string }) {
  return (
    <div className="card rounded p-3 sm:p-4">
      <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${cls}`}>{icon}</div>
      <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 leading-tight">{label}</p>
      <p className={`text-xl sm:text-2xl font-extrabold ${cls.split(" ")[0]}`}>{value}</p>
    </div>
  )
}

/* ── Quiz Form (shared desktop/mobile) ── */
function QuizForm({
  form, setForm, saving, editingQuiz, onSave, onCancel,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  saving: boolean
  editingQuiz: QuizRow | null
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="form-label">ชื่อแบบทดสอบ *</label>
        <input className="input rounded" placeholder="เช่น แบบทดสอบหน่วยที่ 1"
          value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      </div>
      <div>
        <label className="form-label">คำอธิบาย</label>
        <textarea className="input rounded resize-y" rows={2} placeholder="รายละเอียดเพิ่มเติม..."
          value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="form-label">คะแนนผ่าน (%)</label>
          <input type="number" min={0} max={100} className="input rounded"
            value={form.pass_score} onChange={e => setForm(p => ({ ...p, pass_score: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="form-label">เวลา (นาที)</label>
          <input type="number" min={0} className="input rounded" placeholder="ไม่จำกัด"
            value={form.time_limit} onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="form-label">วันเปิด–ปิด (ไม่บังคับ)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="datetime-local" className="input rounded text-[11px]"
            value={form.opens_at} onChange={e => setForm(p => ({ ...p, opens_at: e.target.value }))} />
          <input type="datetime-local" className="input rounded text-[11px]"
            value={form.closes_at} onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" className="accent-blue-600"
          checked={form.is_open} onChange={e => setForm(p => ({ ...p, is_open: e.target.checked }))} />
        เปิดให้ทำทันที
      </label>

      {/* ── Grade Filter ── */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0 text-xs font-bold">กำหนดชั้นที่มองเห็น</label>
          {form.grade_filter.length > 0 && (
            <button
              type="button"
              className="text-[11px] text-blue-600 hover:underline"
              onClick={() => setForm(p => ({ ...p, grade_filter: [] }))}
            >
              ล้าง (ทุกชั้น)
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mb-2">
          {form.grade_filter.length === 0 ? '✅ ทุกชั้นเห็นแบบทดสอบนี้' : `เฉพาะ ${form.grade_filter.join(', ')}`}
        </p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
          {GRADE_GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                <button
                  type="button"
                  className="text-[10px] text-blue-500 hover:underline"
                  onClick={() => {
                    const allIn = group.grades.every(g => form.grade_filter.includes(g))
                    setForm(p => ({
                      ...p,
                      grade_filter: allIn
                        ? p.grade_filter.filter(x => !group.grades.includes(x))
                        : [...new Set([...p.grade_filter, ...group.grades])]
                    }))
                  }}
                >
                  {group.label}
                </button>
              </div>
              {group.grades.map(g => (
                <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 hover:text-blue-600">
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={form.grade_filter.includes(g)}
                    onChange={e => setForm(p => ({
                      ...p,
                      grade_filter: e.target.checked
                        ? [...p.grade_filter, g]
                        : p.grade_filter.filter(x => x !== g)
                    }))}
                  />
                  {g}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        {editingQuiz && (
          <button className="btn flex-1 rounded" onClick={onCancel}>ยกเลิก</button>
        )}
        <button
          className="btn btn-primary rounded"
          style={{ flex: editingQuiz ? 1 : undefined, width: editingQuiz ? undefined : "100%" }}
          onClick={onSave} disabled={saving}
        >
          {saving ? <><div className="spinner" /> บันทึก...</>
            : editingQuiz ? "บันทึกการแก้ไข" : <><Plus size={13} /> สร้างแบบทดสอบ</>}
        </button>
      </div>
    </div>
  )
}

/* ── Quiz Card ── */
function QuizCard({ quiz, isEditing, onToggleOpen, onEdit, onManage, onPreview, onViolations, onDelete }: {
  quiz: QuizRow; isEditing: boolean
  onToggleOpen: () => void; onEdit: () => void; onManage: () => void
  onPreview: () => void; onViolations: () => void; onDelete: () => void
}) {
  return (
    <div className={`card rounded p-3 sm:p-4 transition-all ${isEditing ? "border-blue-500 ring-2 ring-blue-100" : ""}`}
      style={{ border: isEditing ? "1.5px solid" : undefined }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isEditing && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">กำลังแก้ไข</span>
            )}
            <h3 className="font-bold text-sm truncate">{quiz.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${quiz.is_open ? "bg-green-50 text-green-600 border-green-300" : "bg-red-50 text-red-500 border-red-200"}`}>
              {quiz.is_open ? "เปิด" : "ปิด"}
            </span>
          </div>
          {quiz.description && (
            <p className="text-xs text-gray-400 mb-2 leading-relaxed line-clamp-2">{quiz.description}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
            <span>📝 {quiz.questions?.[0]?.count ?? 0} ข้อ</span>
            <span>🎯 ผ่าน {quiz.pass_score}%</span>
            {quiz.time_limit && (
              <span className="flex items-center gap-1"><Clock size={10} /> {quiz.time_limit} นาที</span>
            )}
            {quiz.opens_at && (
              <span>📅 {new Date(quiz.opens_at).toLocaleDateString("th-TH")}{quiz.closes_at && ` – ${new Date(quiz.closes_at).toLocaleDateString("th-TH")}`}</span>
            )}
          </div>
          {/* Grade filter badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {((quiz as any).grade_filter?.length > 0)
              ? (quiz as any).grade_filter.map((g: string) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                    {g}
                  </span>
                ))
              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">ทุกชั้น</span>
            }
          </div>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <button className={`btn btn-sm rounded flex items-center gap-1 ${quiz.is_open ? "text-green-600" : "text-gray-400"}`} onClick={onToggleOpen}>
          {quiz.is_open ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
          {quiz.is_open ? "ปิด" : "เปิด"}
        </button>
        <button className="btn btn-sm rounded flex items-center gap-1" onClick={onManage}>
          <Edit2 size={11} /> ข้อสอบ
        </button>
        <button className="btn btn-sm rounded flex items-center gap-1 text-blue-600" onClick={onPreview}>
          <Eye size={11} /> พรีวิว
        </button>
        <button className="btn btn-sm rounded flex items-center gap-1 text-amber-600" onClick={onViolations}>
          <AlertTriangle size={11} />
          <span className="hidden sm:inline">ออกกลางคัน</span>
          <span className="sm:hidden">ละเมิด</span>
        </button>
        <button className="btn btn-sm rounded flex items-center gap-1" onClick={onEdit}>
          แก้ไข
        </button>
        <button className="btn btn-sm btn-danger rounded" onClick={onDelete}><Trash2 size={11} /></button>
      </div>
    </div>
  )
}

/* ── Violations Modal ── */
function ViolationsModal({ quizId, quizTitle, onClose }: { quizId: string; quizTitle: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [{ data: d1 }, { data: d2 }, { data: d3 }] = await Promise.all([
        supabase.from("quiz_sessions").select("*, student:profiles!quiz_sessions_student_id_fkey(full_name,nickname,grade,student_id)").eq("quiz_id", quizId).gte("leave_count", 1),
        supabase.from("quiz_sessions").select("*, student:profiles!quiz_sessions_student_id_fkey(full_name,nickname,grade,student_id)").eq("quiz_id", quizId).eq("status", "blocked"),
        supabase.from("quiz_sessions").select("*, student:profiles!quiz_sessions_student_id_fkey(full_name,nickname,grade,student_id)").eq("quiz_id", quizId).eq("status", "left"),
      ])
      const merged = [...(d1 ?? []), ...(d2 ?? []), ...(d3 ?? [])]
      const unique = merged.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
      unique.sort((a, b) => (b.leave_count ?? 0) - (a.leave_count ?? 0))
      setSessions(unique as Session[])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function resetStudent(session: Session) {
    if (!confirm(`อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name} ทำอีกครั้ง?`)) return
    setResetting(session.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("quiz_sessions").update({ leave_count: 0, status: "active", reset_by: user?.id ?? null, reset_at: new Date().toISOString() }).eq("id", session.id)
    await supabase.from("submissions").delete().eq("quiz_id", quizId).eq("student_id", session.student_id)
    setResetting(null)
    toast.success(`✅ อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name ?? "นักเรียน"} ทำซ้ำแล้ว`)
    await load()
  }

  const blocked = sessions.filter(s => s.status === "blocked" || s.leave_count >= 3)
  const warned  = sessions.filter(s => s.leave_count > 0 && s.leave_count < 3 && s.status !== "blocked")
  const left    = sessions.filter(s => s.status === "left" && s.leave_count === 0)

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--surface)" }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 className="font-bold text-sm sm:text-base">การออกกลางคัน</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{quizTitle}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-icon btn-ghost rounded" onClick={load}><RefreshCw size={14} /></button>
            <button className="btn btn-icon btn-ghost rounded" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">กำลังโหลด...</p>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">ไม่มีนักเรียนที่ออกกลางคัน</p>
          ) : (
            <div className="flex flex-col gap-5">
              {blocked.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> ถูกล็อค ({blocked.length} คน)
                  </p>
                  <div className="flex flex-col gap-2">
                    {blocked.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
                  </div>
                </div>
              )}
              {warned.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> มีประวัติออก ({warned.length} คน)
                  </p>
                  <div className="flex flex-col gap-2">
                    {warned.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
                  </div>
                </div>
              )}
              {left.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> ออกจากการสอบ ({left.length} คน)
                  </p>
                  <div className="flex flex-col gap-2">
                    {left.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function SessionRow({ session, onReset, resetting }: { session: Session; onReset: (s: Session) => void; resetting: boolean }) {
  const isBlocked = session.status === "blocked" || session.leave_count >= 3
  const isLeft    = session.status === "left" && session.leave_count === 0
  const name      = session.student?.nickname ?? session.student?.full_name ?? "-"
  const MAX = 3; const count = session.leave_count ?? 0

  return (
    <div className={`rounded border p-3 ${isBlocked ? "bg-red-50/50 border-red-200" : isLeft ? "border-gray-200" : "bg-amber-50/50 border-amber-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-sm">{name}</span>
            {session.student?.grade && <span className="text-[11px] text-gray-400">{session.student.grade}</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border
              ${isBlocked ? "bg-red-50 text-red-600 border-red-300" : isLeft ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-amber-50 text-amber-600 border-amber-300"}`}>
              {isBlocked ? "🚫 ล็อค" : isLeft ? "🚪 ออก" : "⚠️ เตือน"}
            </span>
          </div>
          {session.student?.student_id && (
            <p className="text-[11px] text-gray-400 mb-2">รหัส {session.student.student_id}</p>
          )}
          {!isLeft && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-medium">ออก</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX }).map((_, i) => (
                  <div key={i}
                    className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold border
                      ${i < count ? (i === MAX - 1 || isBlocked ? "bg-red-600 text-white border-red-600" : "bg-amber-500 text-white border-amber-500") : "bg-white text-gray-400 border-gray-200"}`}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <span className={`text-xs font-bold ${isBlocked ? "text-red-600" : count >= 2 ? "text-amber-500" : "text-gray-600"}`}>
                {count}/{MAX}
              </span>
            </div>
          )}
        </div>
        <button
          className="btn btn-sm btn-primary rounded flex items-center gap-1 shrink-0 text-xs"
          onClick={() => onReset(session)} disabled={resetting}
        >
          {resetting ? <><div className="spinner" style={{ width: 11, height: 11 }} />รีเซ็ต...</> : <><RefreshCw size={11} />อนุญาต</>}
        </button>
      </div>
    </div>
  )
}