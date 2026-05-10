"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  Plus, X, Clock, ToggleLeft, ToggleRight, Edit2, Trash2,
  AlertTriangle, RefreshCw, BookOpen, Eye, LayoutGrid,
  CheckCircle2, XCircle, TrendingUp
} from "lucide-react"
import toast from "react-hot-toast"
import type { Quiz, QuizOption } from "@/types/quiz"

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
  student: {
    full_name: string
    nickname: string | null
    grade: string | null
    student_id: string | null
  } | null
}

const EMPTY_FORM = {
  title: "",
  description: "",
  pass_score: 60,
  time_limit: "" as number | string,
  is_open: false,
  opens_at: "",
  closes_at: "",
}

export default function AdminDashboardClient({ quizzes: init }: { quizzes: QuizRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [quizzes, setQuizzes] = useState(init)
  const [editingQuiz, setEditingQuiz] = useState<QuizRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
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
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editingQuiz])

  const totalQuizzes = quizzes.length
  const openQuizzes = quizzes.filter(q => q.is_open).length
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
    if (editingQuiz?.id === id) setEditingQuiz(null)
    toast.success("ลบแล้ว")
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("กรุณาใส่ชื่อ"); return }
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      pass_score: Number(form.pass_score),
      time_limit: form.time_limit ? Number(form.time_limit) : null,
      is_open: form.is_open,
      opens_at: form.opens_at || null,
      closes_at: form.closes_at || null,
    }

    if (editingQuiz) {
      const { data, error } = await supabase
        .from("quizzes")
        .update(payload)
        .eq("id", editingQuiz.id)
        .select("*, questions(count)")
        .single()
      if (error || !data) { toast.error("บันทึกไม่สำเร็จ"); setSaving(false); return }
      setQuizzes(p => p.map(q => q.id === data.id ? data : q))
      setEditingQuiz(null)
      toast.success("บันทึกแล้ว ✓")
    } else {
      const { data, error } = await supabase
        .from("quizzes")
        .insert(payload)
        .select("*, questions(count)")
        .single()
      if (error || !data) { toast.error("สร้างไม่สำเร็จ"); setSaving(false); return }
      setQuizzes(p => [data, ...p])
      setForm(EMPTY_FORM)
      toast.success("สร้างแบบทดสอบแล้ว ✓")
    }
    setSaving(false)
  }

  function handleCancel() {
    setEditingQuiz(null)
    setForm(EMPTY_FORM)
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>จัดการแบบทดสอบ</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            ระบบสร้างและบริหารข้อสอบออนไลน์
          </p>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        marginBottom: 20,
      }}>
        <StatCard icon={<LayoutGrid size={15} />} label="ชุดข้อสอบทั้งหมด" value={totalQuizzes} color="var(--blue)" bg="var(--blue-light)" />
        <StatCard icon={<CheckCircle2 size={15} />} label="เปิดใช้งาน" value={openQuizzes} color="var(--green)" bg="var(--green-light)" />
        <StatCard icon={<TrendingUp size={15} />} label="จำนวนข้อทั้งหมด" value={totalQuestions} color="var(--amber)" bg="var(--amber-light)" />
      </div>

      {/* ── Split Layout ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: 20,
        alignItems: "start",
      }}>

        {/* ── LEFT: Sticky Form ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div className="card" style={{ padding: "20px 24px", borderRadius: 6 }}>

            {/* Form Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700 }}>
                  {editingQuiz ? "✏️ แก้ไขแบบทดสอบ" : "➕ สร้างแบบทดสอบใหม่"}
                </h2>
                {editingQuiz && (
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                    {editingQuiz.title}
                  </p>
                )}
              </div>
              {editingQuiz && (
                <button className="btn btn-icon btn-ghost" onClick={handleCancel} title="ยกเลิกแก้ไข" style={{ borderRadius: 4 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">ชื่อแบบทดสอบ *</label>
                <input
                  className="input"
                  style={{ borderRadius: 4 }}
                  placeholder="เช่น แบบทดสอบหน่วยที่ 1"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">คำอธิบาย</label>
                <textarea
                  className="input"
                  rows={2}
                  style={{ resize: "vertical", borderRadius: 4 }}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">คะแนนผ่าน (%)</label>
                  <input
                    type="number" min={0} max={100} className="input"
                    style={{ borderRadius: 4 }}
                    value={form.pass_score}
                    onChange={e => setForm(p => ({ ...p, pass_score: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="form-label">เวลา (นาที)</label>
                  <input
                    type="number" min={0} className="input"
                    style={{ borderRadius: 4 }}
                    value={form.time_limit}
                    onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))}
                    placeholder="ไม่จำกัด"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">วันเปิด–ปิด (ไม่บังคับ)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="datetime-local" className="input"
                    style={{ fontSize: 11, borderRadius: 4 }}
                    value={form.opens_at}
                    onChange={e => setForm(p => ({ ...p, opens_at: e.target.value }))}
                  />
                  <input
                    type="datetime-local" className="input"
                    style={{ fontSize: 11, borderRadius: 4 }}
                    value={form.closes_at}
                    onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, paddingTop: 2 }}>
                <input
                  type="checkbox"
                  checked={form.is_open}
                  onChange={e => setForm(p => ({ ...p, is_open: e.target.checked }))}
                />
                เปิดให้ทำแบบทดสอบทันที
              </label>
            </div>

            {/* Form Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {editingQuiz && (
                <button className="btn" style={{ flex: 1, borderRadius: 4 }} onClick={handleCancel}>
                  ยกเลิก
                </button>
              )}
              <button
                className="btn btn-primary"
                style={{ flex: editingQuiz ? 1 : undefined, width: editingQuiz ? undefined : "100%", borderRadius: 4 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><div className="spinner" /> บันทึก...</>
                  : editingQuiz ? "บันทึกการแก้ไข" : <><Plus size={13} /> สร้างแบบทดสอบ</>
                }
              </button>
            </div>
          </div>

          {/* Tips */}
          <div style={{
            marginTop: 10,
            padding: "12px 16px",
            borderRadius: 6,
            background: "var(--blue-light)",
            border: "1px solid rgba(37,99,235,0.15)",
            fontSize: 11,
            color: "var(--text-3)",
            lineHeight: 1.6,
          }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--blue)" }}>💡 วิธีใช้</p>
            <p>กดปุ่ม <strong>แก้ไข</strong> ในรายการด้านขวา เพื่อโหลดข้อมูลมาแก้ไขในฟอร์มนี้</p>
          </div>
        </div>

        {/* ── RIGHT: Quiz List ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)" }}>
              รายการแบบทดสอบ ({quizzes.length})
            </h2>
          </div>

          {quizzes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-3)", borderRadius: 6 }}>
              <BookOpen size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>ยังไม่มีแบบทดสอบ</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>สร้างจากฟอร์มด้านซ้าย</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quizzes.map(q => (
                <QuizCard
                  key={q.id}
                  quiz={q}
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

      {/* ── Violations Modal ── */}
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
function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className="card" style={{ padding: "12px 16px", borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 4,
          background: bg, color,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 1 }}>{label}</p>
          <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Quiz Card ── */
function QuizCard({
  quiz, isEditing,
  onToggleOpen, onEdit, onManage, onPreview, onViolations, onDelete,
}: {
  quiz: QuizRow
  isEditing: boolean
  onToggleOpen: () => void
  onEdit: () => void
  onManage: () => void
  onPreview: () => void
  onViolations: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        borderRadius: 6,
        transition: "box-shadow 0.2s, border-color 0.2s",
        border: isEditing ? "1.5px solid var(--blue)" : undefined,
        boxShadow: isEditing ? "0 0 0 3px rgba(37,99,235,0.08)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {isEditing && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                background: "var(--blue)", color: "#fff",
              }}>
                กำลังแก้ไข
              </span>
            )}
            <h3 style={{ fontWeight: 700, fontSize: 14 }}>{quiz.title}</h3>
            <span className={`badge ${quiz.is_open ? "badge-green" : "badge-red"}`}
              style={{ borderRadius: 3 }}>
              {quiz.is_open ? "เปิด" : "ปิด"}
            </span>
          </div>

          {quiz.description && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 5, lineHeight: 1.5 }}>
              {quiz.description}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "var(--text-2)" }}>
            <span>📝 {quiz.questions?.[0]?.count ?? 0} ข้อ</span>
            <span>🎯 ผ่าน {quiz.pass_score}%</span>
            {quiz.time_limit && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={10} /> {quiz.time_limit} นาที
              </span>
            )}
            {quiz.opens_at && (
              <span>
                📅 {new Date(quiz.opens_at).toLocaleDateString("th-TH")}
                {quiz.closes_at && ` – ${new Date(quiz.closes_at).toLocaleDateString("th-TH")}`}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flexShrink: 0, justifyContent: "flex-end" }}>
          <button
            className="btn btn-sm"
            style={{ color: quiz.is_open ? "var(--green)" : "var(--text-3)", borderRadius: 4 }}
            onClick={onToggleOpen}
          >
            {quiz.is_open ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            {quiz.is_open ? "ปิด" : "เปิด"}
          </button>

          <button className="btn btn-sm" style={{ borderRadius: 4 }} onClick={onManage}>
            <Edit2 size={11} /> ข้อสอบ
          </button>

          <button className="btn btn-sm" style={{ color: "var(--blue)", borderRadius: 4 }} onClick={onPreview}>
            <Eye size={11} /> พรีวิว
          </button>

          <button className="btn btn-sm" style={{ color: "var(--amber)", borderRadius: 4 }} onClick={onViolations}>
            <AlertTriangle size={11} /> ออกกลางคัน
          </button>

          <button
            className="btn btn-sm"
            style={{
              borderRadius: 4,
              background: isEditing ? "var(--blue-light)" : undefined,
              color: isEditing ? "var(--blue)" : undefined,
            }}
            onClick={onEdit}
          >
            แก้ไข
          </button>

          <button className="btn btn-sm btn-danger" style={{ borderRadius: 4 }} onClick={onDelete}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Violations Modal ── */
function ViolationsModal({ quizId, quizTitle, onClose }: {
  quizId: string
  quizTitle: string
  onClose: () => void
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: d1 } = await supabase
        .from("quiz_sessions")
        .select("*, student:profiles!quiz_sessions_student_id_fkey(full_name, nickname, grade, student_id)")
        .eq("quiz_id", quizId).gte("leave_count", 1)
      const { data: d2 } = await supabase
        .from("quiz_sessions")
        .select("*, student:profiles!quiz_sessions_student_id_fkey(full_name, nickname, grade, student_id)")
        .eq("quiz_id", quizId).eq("status", "blocked")
      const { data: d3 } = await supabase
        .from("quiz_sessions")
        .select("*, student:profiles!quiz_sessions_student_id_fkey(full_name, nickname, grade, student_id)")
        .eq("quiz_id", quizId).eq("status", "left")
      const merged = [...(d1 ?? []), ...(d2 ?? []), ...(d3 ?? [])]
      const unique = merged.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
      unique.sort((a, b) => (b.leave_count ?? 0) - (a.leave_count ?? 0))
      setSessions(unique as Session[])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function resetStudent(session: Session) {
    if (!confirm(`อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name} ทำแบบทดสอบอีกครั้ง?`)) return
    setResetting(session.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: se } = await supabase.from("quiz_sessions").update({
      leave_count: 0, status: "active",
      reset_by: user?.id ?? null,
      reset_at: new Date().toISOString(),
    }).eq("id", session.id)
    const { error: de } = await supabase.from("submissions")
      .delete().eq("quiz_id", quizId).eq("student_id", session.student_id)
    setResetting(null)
    if (se || de) { toast.error(`รีเซ็ตไม่สำเร็จ`); return }
    toast.success(`✅ อนุญาตให้ ${session.student?.nickname ?? session.student?.full_name ?? "นักเรียน"} ทำซ้ำแล้ว`)
    await load()
  }

  const blocked = sessions.filter(s => s.status === "blocked" || s.leave_count >= 3)
  const warned = sessions.filter(s => s.leave_count > 0 && s.leave_count < 3 && s.status !== "blocked")
  const left = sessions.filter(s => s.status === "left" && s.leave_count === 0)

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 9999, padding: "24px 16px", overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", borderRadius: 8, width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>การออกกลางคัน</h3>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{quizTitle}</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-icon btn-ghost" style={{ borderRadius: 4 }} onClick={load}><RefreshCw size={15} /></button>
            <button className="btn btn-icon btn-ghost" style={{ borderRadius: 4 }} onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div style={{ padding: "16px 24px", maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <p style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>กำลังโหลด...</p>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-3)" }}>
              <p style={{ fontSize: 13 }}>ไม่มีนักเรียนที่ออกกลางคัน</p>
            </div>
          ) : (
            <>
              {blocked.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> ถูกล็อค ({blocked.length} คน)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {blocked.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
                  </div>
                </div>
              )}
              {warned.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> มีประวัติออก ({warned.length} คน)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {warned.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
                  </div>
                </div>
              )}
              {left.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={13} /> ออกจากการสอบ ({left.length} คน)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {left.map(s => <SessionRow key={s.id} session={s} onReset={resetStudent} resetting={resetting === s.id} />)}
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

function SessionRow({ session, onReset, resetting }: {
  session: Session
  onReset: (s: Session) => void
  resetting: boolean
}) {
  const isBlocked = session.status === "blocked" || session.leave_count >= 3
  const isLeft = session.status === "left" && session.leave_count === 0
  const name = session.student?.nickname ?? session.student?.full_name ?? "-"
  const MAX = 3
  const count = session.leave_count ?? 0

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 6,
      border: `1.5px solid ${isBlocked ? "rgba(220,38,38,0.25)" : isLeft ? "rgba(100,100,100,0.15)" : "rgba(217,119,6,0.25)"}`,
      background: isBlocked ? "rgba(220,38,38,0.04)" : isLeft ? "var(--surface)" : "rgba(217,119,6,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
            {session.student?.grade && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{session.student.grade}</span>}
            <span
              className={`badge ${isBlocked ? "badge-red" : isLeft ? "" : "badge-amber"}`}
              style={{ borderRadius: 3, ...(isLeft ? { background: "rgba(100,100,100,0.1)", color: "var(--text-3)" } : {}) }}
            >
              {isBlocked ? "🚫 ล็อค" : isLeft ? "🚪 ออก" : "⚠️ เตือน"}
            </span>
          </div>
          {session.student?.student_id && (
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>รหัส {session.student.student_id}</p>
          )}
          {!isLeft && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>ออกแล้ว</span>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: MAX }).map((_, i) => (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: 3,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    background: i < count ? (i === MAX - 1 || isBlocked ? "#dc2626" : "#d97706") : "var(--surface)",
                    color: i < count ? "white" : "var(--text-3)",
                    border: i < count ? "none" : "1.5px solid var(--border)",
                  }}>{i + 1}</div>
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: isBlocked ? "var(--red)" : count >= 2 ? "#d97706" : "var(--text-2)" }}>
                {count}/{MAX} ครั้ง
              </span>
            </div>
          )}
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => onReset(session)}
          disabled={resetting}
          style={{ fontSize: 11, gap: 5, flexShrink: 0, marginTop: 2, borderRadius: 4 }}
        >
          {resetting
            ? <><div className="spinner" style={{ width: 11, height: 11 }} />รีเซ็ต...</>
            : <><RefreshCw size={11} />อนุญาตทำซ้ำ</>
          }
        </button>
      </div>
    </div>
  )
}