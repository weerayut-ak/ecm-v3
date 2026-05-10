"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowLeft, Eye, ChevronDown, ChevronUp, Edit2, X } from "lucide-react"
import toast from "react-hot-toast"
import type { Question, QuizOption } from "@/types/quiz"

interface AdminQuestionsClientProps {
  quizId: string
  quizTitle: string
  initialQuestions: Question[]
}

type QuestionType = "mcq" | "fill" | "essay"

const LABEL_MAP: Record<QuestionType, string> = {
  mcq: "ปรนัย",
  fill: "เติมคำ",
  essay: "อัตนัย",
}

const TYPE_COLOR: Record<QuestionType, { bg: string; color: string }> = {
  mcq: { bg: "var(--blue-light)", color: "var(--blue)" },
  fill: { bg: "var(--green-light)", color: "var(--green)" },
  essay: { bg: "var(--amber-light)", color: "var(--amber)" },
}

const EMPTY_OPTIONS = [
  { label: "A", text: "" },
  { label: "B", text: "" },
  { label: "C", text: "" },
  { label: "D", text: "" },
]

export default function AdminQuestionsClient({
  quizId,
  quizTitle,
  initialQuestions,
}: AdminQuestionsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [mode, setMode] = useState<"single" | "bulk">("single")

  // ── Form state (shared for add & edit) ──
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [type, setType] = useState<QuestionType>("mcq")
  const [questionText, setQuestionText] = useState("")
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [correctIndex, setCorrectIndex] = useState(0)
  const [fillAnswer, setFillAnswer] = useState("")
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)

  // ── Bulk state ──
  const [bulkText, setBulkText] = useState("")
  const [bulkImporting, setBulkImporting] = useState(false)

  function resetForm() {
    setQuestionText("")
    setOptions(EMPTY_OPTIONS)
    setCorrectIndex(0)
    setFillAnswer("")
    setPoints(1)
  }

  function cancelEdit() {
    setEditingQuestion(null)
    resetForm()
  }

  function loadForEdit(q: Question) {
    setMode("single")
    setEditingQuestion(q)
    setType(q.type as QuestionType)
    setQuestionText(q.question_text)
    setOptions(
      q.type === "mcq" && q.options
        ? (q.options as QuizOption[])
        : EMPTY_OPTIONS
    )
    setCorrectIndex(q.type === "mcq" ? Number(q.correct_answer ?? 0) : 0)
    setFillAnswer(q.type === "fill" ? (q.correct_answer ?? "") : "")
    setPoints(q.points ?? 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Parse bulk MCQ ──
  function parseBulkMCQ(text: string): Partial<Question>[] {
    const blocks = text.trim().split(/\n{2,}/).filter(b => b.trim())
    return blocks.map((block, i) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
      const question_text = lines[0].replace(/^\d+\.\s*/, "")
      const opts: QuizOption[] = []
      let correct_answer = "0"
      lines.slice(1).forEach(line => {
        const m = line.match(/^([A-Da-d])[.)]\s*(.+)/)
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65
          opts.push({ label: m[1].toUpperCase(), text: m[2].replace(/\*$/, "").trim() })
          if (line.includes("*")) correct_answer = String(idx)
        }
      })
      return {
        type: "mcq" as const,
        question_text,
        options: opts,
        correct_answer,
        sort_order: questions.length + i,
        quiz_id: quizId,
        points: 1,
      }
    }).filter(q => q.question_text && (q.options as QuizOption[])?.length > 0)
  }

  const parsedBulk = parseBulkMCQ(bulkText)

  // ── Save (add or update) ──
  async function handleSave(andContinue = false) {
    if (!questionText.trim()) { toast.error("กรุณาใส่คำถาม"); return }
    if (type === "mcq" && options.some(o => !o.text.trim())) { toast.error("กรุณาใส่ตัวเลือกให้ครบ"); return }
    setSaving(true)

    const payload: Partial<Question> = {
      quiz_id: quizId,
      type,
      question_text: questionText,
      options: type === "mcq" ? options : null,
      correct_answer:
        type === "mcq" ? String(correctIndex)
        : type === "fill" ? fillAnswer
        : null,
      points,
    }

    if (editingQuestion) {
      // ── UPDATE ──
      const { data, error } = await supabase
        .from("questions")
        .update(payload)
        .eq("id", editingQuestion.id)
        .select()
        .single()
      if (error || !data) { toast.error("แก้ไขไม่สำเร็จ: " + error?.message); setSaving(false); return }
      setQuestions(p => p.map(q => q.id === data.id ? data : q))
      toast.success("แก้ไขข้อสอบแล้ว ✓")
      cancelEdit()
    } else {
      // ── INSERT ──
      const { data, error } = await supabase
        .from("questions")
        .insert({ ...payload, sort_order: questions.length })
        .select()
        .single()
      if (error || !data) { toast.error("เพิ่มไม่สำเร็จ: " + error?.message); setSaving(false); return }
      setQuestions(p => [...p, data])
      toast.success("เพิ่มข้อสอบแล้ว ✓")
      if (andContinue) resetForm()
    }
    setSaving(false)
  }

  // ── Import bulk ──
  async function importBulk() {
    if (!parsedBulk.length) { toast.error("ไม่พบข้อสอบที่ถูกรูปแบบ"); return }
    setBulkImporting(true)
    const { data, error } = await supabase.from("questions").insert(parsedBulk).select()
    if (error) { toast.error("นำเข้าไม่สำเร็จ: " + error.message); setBulkImporting(false); return }
    setQuestions(p => [...p, ...(data ?? [])])
    setBulkText("")
    setBulkImporting(false)
    toast.success(`นำเข้า ${data?.length} ข้อ ✓`)
  }

  // ── Delete question ──
  async function deleteQ(id: string) {
    if (!confirm("ลบข้อนี้?")) return
    await supabase.from("questions").delete().eq("id", id)
    setQuestions(p => p.filter(q => q.id !== id))
    if (editingQuestion?.id === id) cancelEdit()
    toast.success("ลบแล้ว")
  }

  const typeCounts = questions.reduce(
    (acc, q) => { acc[q.type as QuestionType] = (acc[q.type as QuestionType] ?? 0) + 1; return acc },
    {} as Record<QuestionType, number>
  )

  const isEditing = !!editingQuestion

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => router.push("/dashboard/admin/quizzes")}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <ArrowLeft size={13} /> กลับ
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700 }}>จัดการข้อสอบ</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {quizTitle} · {questions.length} ข้อ
          </p>
        </div>
        <button
          className="btn btn-sm"
          style={{ color: "var(--blue)", display: "flex", alignItems: "center", gap: 5 }}
          onClick={() => router.push(`/dashboard/admin/quizzes/${quizId}/preview`)}
        >
          <Eye size={13} /> พรีวิว
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["mcq", "fill", "essay"] as QuestionType[]).map(t => (
          <div key={t} style={{
            padding: "4px 10px", borderRadius: 3,
            background: TYPE_COLOR[t].bg,
            color: TYPE_COLOR[t].color,
            fontSize: 12, fontWeight: 600,
            border: "1px solid currentColor",
            opacity: 0.85,
          }}>
            {LABEL_MAP[t]} {typeCounts[t] ?? 0} ข้อ
          </div>
        ))}
      </div>

      {/* ── Split Layout ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        gap: 20,
        alignItems: "start",
      }}>

        {/* ── LEFT: Form ── */}
        <div style={{ position: "sticky", top: 24 }}>

          {/* Mode Tabs — hidden while editing */}
          {!isEditing && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button
                className={`btn btn-sm ${mode === "single" ? "btn-primary" : ""}`}
                style={{ flex: 1, justifyContent: "center", borderRadius: 4 }}
                onClick={() => setMode("single")}
              >
                <Plus size={12} /> เพิ่มทีละข้อ
              </button>
              <button
                className={`btn btn-sm ${mode === "bulk" ? "btn-primary" : ""}`}
                style={{ flex: 1, justifyContent: "center", borderRadius: 4 }}
                onClick={() => setMode("bulk")}
              >
                📋 วางหลายข้อ
              </button>
            </div>
          )}

          {/* ── Single / Edit Form ── */}
          {(mode === "single" || isEditing) && (
            <div className="card" style={{ padding: "18px 20px", borderRadius: 6 }}>
              {/* Form header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700 }}>
                    {isEditing ? "✏️ แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}
                  </h3>
                  {isEditing && (
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      ข้อ {questions.findIndex(q => q.id === editingQuestion?.id) + 1}
                    </p>
                  )}
                </div>
                {isEditing && (
                  <button className="btn btn-icon btn-ghost" onClick={cancelEdit} title="ยกเลิก" style={{ borderRadius: 4 }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Type selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, marginBottom: 12 }}>
                {(["mcq", "fill", "essay"] as QuestionType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`btn btn-sm ${type === t ? "btn-primary" : ""}`}
                    style={{ justifyContent: "center", fontSize: 12, borderRadius: 4 }}
                  >
                    {LABEL_MAP[t]}
                  </button>
                ))}
              </div>

              {/* Question text */}
              <textarea
                className="input"
                rows={3}
                placeholder="คำถาม..."
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                style={{ marginBottom: 12, resize: "vertical", borderRadius: 4 }}
              />

              {/* MCQ options */}
              {type === "mcq" && (
                <div style={{ marginBottom: 12 }}>
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <input
                        type="radio"
                        name="correct_opt"
                        checked={correctIndex === i}
                        onChange={() => setCorrectIndex(i)}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{
                        width: 24, height: 24, borderRadius: 3, flexShrink: 0,
                        background: correctIndex === i ? "var(--green-light)" : "var(--bg-2)",
                        color: correctIndex === i ? "var(--green)" : "var(--text-2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        border: "1px solid var(--border)",
                      }}>
                        {opt.label}
                      </div>
                      <input
                        className="input"
                        style={{ fontSize: 13, borderRadius: 4 }}
                        value={opt.text}
                        onChange={e => setOptions(p => p.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                        placeholder={`ตัวเลือก ${opt.label}`}
                      />
                    </div>
                  ))}
                  {correctIndex !== -1 && (
                    <p style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>
                      ✓ คำตอบที่ถูก: ตัวเลือก {options[correctIndex]?.label}
                    </p>
                  )}
                </div>
              )}

              {/* Fill answer */}
              {type === "fill" && (
                <input
                  className="input"
                  style={{ marginBottom: 12, borderRadius: 4 }}
                  placeholder="คำตอบที่ถูกต้อง..."
                  value={fillAnswer}
                  onChange={e => setFillAnswer(e.target.value)}
                />
              )}

              {/* Essay hint */}
              {type === "essay" && (
                <div style={{
                  padding: "8px 12px", borderRadius: 4, marginBottom: 12,
                  background: "var(--amber-light)",
                  fontSize: 11, color: "var(--amber)",
                  border: "1px solid rgba(217,119,6,0.2)",
                }}>
                  อัตนัย: ครูตรวจให้คะแนนเอง ไม่มีคำตอบอัตโนมัติ
                </div>
              )}

              {/* Points */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--text-2)", flexShrink: 0 }}>คะแนน:</label>
                <input
                  type="number" min={1} className="input"
                  style={{ width: 70, borderRadius: 4 }}
                  value={points}
                  onChange={e => setPoints(Number(e.target.value))}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      style={{ width: "100%", justifyContent: "center", borderRadius: 4 }}
                    >
                      {saving ? <><div className="spinner" />บันทึก...</> : "บันทึกการแก้ไข"}
                    </button>
                    <button
                      className="btn"
                      style={{ width: "100%", justifyContent: "center", borderRadius: 4 }}
                      onClick={cancelEdit}
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      style={{ width: "100%", justifyContent: "center", borderRadius: 4 }}
                    >
                      {saving ? <><div className="spinner" />บันทึก...</> : "บันทึก"}
                    </button>
                    <button
                      className="btn"
                      style={{ width: "100%", justifyContent: "center", borderRadius: 4, background: "rgba(0,80,203,0.1)", color: "var(--blue)", fontWeight: 700 }}
                      onClick={() => handleSave(true)}
                      disabled={saving}
                    >
                      <Plus size={11} /> บันทึก & เพิ่มข้อต่อไป
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Bulk Import Form ── */}
          {mode === "bulk" && !isEditing && (
            <div className="card" style={{ padding: "18px 20px", borderRadius: 6 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📋 วางข้อสอบปรนัยหลายข้อ</h3>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, lineHeight: 1.6 }}>
                แต่ละข้อคั่นด้วยบรรทัดว่าง ใส่ <strong>*</strong> หลังตัวเลือกที่ถูกต้อง
              </p>
              <div style={{
                padding: "8px 12px", borderRadius: 4, marginBottom: 10,
                background: "var(--bg-2)", fontSize: 11,
                fontFamily: "monospace", lineHeight: 1.8, color: "var(--text-2)",
                border: "1px solid var(--border)",
              }}>
                1. คำถามข้อ 1{"\n"}
                A. ตัวเลือก ก{"\n"}
                B. ตัวเลือก ข*{"\n"}
                C. ตัวเลือก ค
              </div>
              <textarea
                className="input"
                rows={12}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical", marginBottom: 10, borderRadius: 4 }}
                placeholder={"1. คำถามข้อ 1\nA. ตัวเลือก A\nB. ตัวเลือก B*\nC. ตัวเลือก C\nD. ตัวเลือก D\n\n2. คำถามข้อ 2\n..."}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: parsedBulk.length > 0 ? "var(--green)" : "var(--text-3)" }}>
                  {parsedBulk.length > 0 ? `✓ ตรวจพบ ${parsedBulk.length} ข้อ` : "ยังไม่มีข้อสอบ"}
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={importBulk}
                disabled={!bulkText.trim() || bulkImporting}
                style={{ width: "100%", justifyContent: "center", borderRadius: 4 }}
              >
                {bulkImporting
                  ? <><div className="spinner" />กำลังนำเข้า...</>
                  : `นำเข้า ${parsedBulk.length} ข้อ`
                }
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Questions List ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)" }}>
              รายการข้อสอบ ({questions.length} ข้อ)
            </h2>
          </div>

          {questions.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-3)", borderRadius: 6 }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>📝</p>
              <p style={{ fontSize: 13 }}>ยังไม่มีข้อสอบ</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>เพิ่มข้อสอบจากฟอร์มด้านซ้าย</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {questions.map((q, i) => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  index={i}
                  isEditing={editingQuestion?.id === q.id}
                  onEdit={() => loadForEdit(q)}
                  onDelete={() => deleteQ(q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Question Item ── */
function QuestionItem({ question: q, index, isEditing, onEdit, onDelete }: {
  question: Question
  index: number
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const type = q.type as QuestionType
  const color = TYPE_COLOR[type] ?? TYPE_COLOR.mcq

  return (
    <div style={{
      border: `1.5px solid ${isEditing ? "var(--blue)" : "var(--border)"}`,
      borderRadius: 6,
      background: "var(--surface)",
      overflow: "hidden",
      boxShadow: isEditing ? "0 0 0 3px rgba(37,99,235,0.08)" : undefined,
      transition: "box-shadow 0.15s, border-color 0.15s",
    }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "11px 14px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* Number badge */}
        <div style={{
          width: 26, height: 26, borderRadius: 4,
          background: color.bg, color: color.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          border: "1px solid currentColor", opacity: 0.85,
        }}>
          {index + 1}
        </div>

        {/* Question text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
            {q.question_text}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              fontSize: 10, padding: "1px 7px", borderRadius: 3,
              background: color.bg, color: color.color, fontWeight: 600,
              border: "1px solid currentColor", opacity: 0.85,
            }}>
              {LABEL_MAP[type]}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{q.points} คะแนน</span>
            {isEditing && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                background: "var(--blue)", color: "#fff",
              }}>
                กำลังแก้ไข
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            onClick={onEdit}
            title="แก้ไขข้อสอบ"
          >
            <Edit2 size={12} />
          </button>
          <button
            className="btn btn-icon btn-ghost"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            onClick={() => setExpanded(p => !p)}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            className="btn btn-icon btn-danger"
            style={{ width: 28, height: 28, borderRadius: 4 }}
            onClick={onDelete}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expanded: options */}
      {expanded && q.type === "mcq" && q.options && (
        <div style={{
          padding: "0 14px 12px 50px",
          display: "flex", flexWrap: "wrap", gap: 5,
          borderTop: "1px solid var(--border)",
          paddingTop: 10,
        }}>
          {(q.options as QuizOption[]).map((opt, oi) => {
            const isCorrect = String(oi) === String(q.correct_answer)
            return (
              <div key={oi} style={{
                padding: "3px 10px", borderRadius: 4,
                background: isCorrect ? "var(--green-light)" : "var(--bg-2)",
                color: isCorrect ? "var(--green)" : "var(--text-3)",
                fontWeight: isCorrect ? 700 : 400,
                fontSize: 12,
                border: isCorrect ? "1px solid rgba(22,163,74,0.3)" : "1px solid var(--border)",
              }}>
                {opt.label}. {opt.text} {isCorrect && "✓"}
              </div>
            )
          })}
        </div>
      )}
      {expanded && q.type === "fill" && (
        <div style={{ padding: "8px 14px 12px 50px", borderTop: "1px solid var(--border)" }}>
          <span style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 4,
            background: "var(--green-light)", color: "var(--green)",
            fontWeight: 600, border: "1px solid rgba(22,163,74,0.3)",
          }}>
            ✓ คำตอบ: {q.correct_answer}
          </span>
        </div>
      )}
      {expanded && q.type === "essay" && (
        <div style={{ padding: "8px 14px 12px 50px", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>ตรวจโดยครู</span>
        </div>
      )}
    </div>
  )
}