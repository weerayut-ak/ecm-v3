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

const TYPE_STYLE: Record<QuestionType, { bg: string; text: string; border: string }> = {
  mcq:   { bg: "bg-blue-50",   text: "text-blue-600",  border: "border-blue-300" },
  fill:  { bg: "bg-green-50",  text: "text-green-600", border: "border-green-300" },
  essay: { bg: "bg-amber-50",  text: "text-amber-600", border: "border-amber-300" },
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

  const [questions, setQuestions]     = useState<Question[]>(initialQuestions)
  const [mode, setMode]               = useState<"single" | "bulk">("single")
  const [formOpen, setFormOpen]       = useState(false) // mobile drawer toggle

  // ── Form state ──
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [type, setType]                       = useState<QuestionType>("mcq")
  const [questionText, setQuestionText]       = useState("")
  const [options, setOptions]                 = useState(EMPTY_OPTIONS)
  const [correctIndex, setCorrectIndex]       = useState(0)
  const [fillAnswer, setFillAnswer]           = useState("")
  const [points, setPoints]                   = useState(1)
  const [saving, setSaving]                   = useState(false)

  // ── Bulk state ──
  const [bulkText, setBulkText]       = useState("")
  const [bulkImporting, setBulkImporting] = useState(false)

  function resetForm() {
    setQuestionText(""); setOptions(EMPTY_OPTIONS)
    setCorrectIndex(0); setFillAnswer(""); setPoints(1)
  }

  function cancelEdit() {
    setEditingQuestion(null); resetForm(); setFormOpen(false)
  }

  function loadForEdit(q: Question) {
    setMode("single")
    setEditingQuestion(q)
    setType(q.type as QuestionType)
    setQuestionText(q.question_text)
    setOptions(q.type === "mcq" && q.options ? (q.options as QuizOption[]) : EMPTY_OPTIONS)
    setCorrectIndex(q.type === "mcq" ? Number(q.correct_answer ?? 0) : 0)
    setFillAnswer(q.type === "fill" ? (q.correct_answer ?? "") : "")
    setPoints(q.points ?? 1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function parseBulkMCQ(text: string): Partial<Question>[] {
    const blocks = text.trim().split(/\n{2,}/).filter(Boolean)
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
      return { type: "mcq" as const, question_text, options: opts, correct_answer, sort_order: questions.length + i, quiz_id: quizId, points: 1 }
    }).filter(q => q.question_text && (q.options as QuizOption[])?.length > 0)
  }

  const parsedBulk = parseBulkMCQ(bulkText)

  async function handleSave(andContinue = false) {
    if (!questionText.trim()) { toast.error("กรุณาใส่คำถาม"); return }
    if (type === "mcq" && options.some(o => !o.text.trim())) { toast.error("กรุณาใส่ตัวเลือกให้ครบ"); return }
    setSaving(true)
    const payload: Partial<Question> = {
      quiz_id: quizId, type, question_text: questionText,
      options: type === "mcq" ? options : null,
      correct_answer: type === "mcq" ? String(correctIndex) : type === "fill" ? fillAnswer : null,
      points,
    }
    if (editingQuestion) {
      const { data, error } = await supabase.from("questions").update(payload).eq("id", editingQuestion.id).select().single()
      if (error || !data) { toast.error("แก้ไขไม่สำเร็จ"); setSaving(false); return }
      setQuestions(p => p.map(q => q.id === data.id ? data : q))
      toast.success("แก้ไขข้อสอบแล้ว ✓")
      cancelEdit()
    } else {
      const { data, error } = await supabase.from("questions").insert({ ...payload, sort_order: questions.length }).select().single()
      if (error || !data) { toast.error("เพิ่มไม่สำเร็จ"); setSaving(false); return }
      setQuestions(p => [...p, data])
      toast.success("เพิ่มข้อสอบแล้ว ✓")
      if (andContinue) resetForm()
      else setFormOpen(false)
    }
    setSaving(false)
  }

  async function importBulk() {
    if (!parsedBulk.length) { toast.error("ไม่พบข้อสอบที่ถูกรูปแบบ"); return }
    setBulkImporting(true)
    const { data, error } = await supabase.from("questions").insert(parsedBulk).select()
    if (error) { toast.error("นำเข้าไม่สำเร็จ"); setBulkImporting(false); return }
    setQuestions(p => [...p, ...(data ?? [])])
    setBulkText(""); setBulkImporting(false); setFormOpen(false)
    toast.success(`นำเข้า ${data?.length} ข้อ ✓`)
  }

  async function deleteQ(id: string) {
    if (!confirm("ลบข้อนี้?")) return
    await supabase.from("questions").delete().eq("id", id)
    setQuestions(p => p.filter(q => q.id !== id))
    if (editingQuestion?.id === id) cancelEdit()
    toast.success("ลบแล้ว")
  }

  const typeCounts = questions.reduce((acc, q) => {
    acc[q.type as QuestionType] = (acc[q.type as QuestionType] ?? 0) + 1; return acc
  }, {} as Record<QuestionType, number>)

  const isEditing = !!editingQuestion

  const formProps = {
    isEditing, editingQuestion, questions, mode, setMode,
    type, setType, questionText, setQuestionText,
    options, setOptions, correctIndex, setCorrectIndex,
    fillAnswer, setFillAnswer, points, setPoints, saving,
    bulkText, setBulkText, parsedBulk, bulkImporting,
    onSave: handleSave, onImportBulk: importBulk, onCancel: cancelEdit,
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-4 py-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className="btn btn-sm btn-ghost flex items-center gap-1 rounded shrink-0"
          onClick={() => router.push("/dashboard/admin/quizzes")}
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">กลับ</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">จัดการข้อสอบ</h1>
          <p className="text-[11px] mt-0.5 truncate text-gray-400">{quizTitle} · {questions.length} ข้อ</p>
        </div>
        {/* Mobile FAB-style add button */}
        <button
          className="btn btn-sm btn-primary flex items-center gap-1 rounded lg:hidden"
          onClick={() => { setEditingQuestion(null); resetForm(); setFormOpen(p => !p) }}
        >
          <Plus size={13} />
          <span className="hidden xs:inline">เพิ่ม</span>
        </button>
        <button
          className="btn btn-sm flex items-center gap-1 rounded text-blue-600"
          onClick={() => router.push(`/dashboard/admin/quizzes/${quizId}/preview`)}
        >
          <Eye size={13} />
          <span className="hidden sm:inline">พรีวิว</span>
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["mcq", "fill", "essay"] as QuestionType[]).map(t => {
          const s = TYPE_STYLE[t]
          return (
            <span key={t} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${s.bg} ${s.text} ${s.border}`}>
              {LABEL_MAP[t]} {typeCounts[t] ?? 0} ข้อ
            </span>
          )
        })}
      </div>

      {/* ── Mobile: collapsible form panel ── */}
      {(formOpen || isEditing) && (
        <div className="lg:hidden mb-4 border rounded overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-bold">{isEditing ? "✏️ แก้ไขข้อสอบ" : "เพิ่มข้อสอบ"}</p>
            <button className="btn btn-icon btn-ghost rounded" onClick={cancelEdit}><X size={14} /></button>
          </div>
          <div className="p-4">
            <FormContent {...formProps} />
          </div>
        </div>
      )}

      {/* ── Desktop: 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">

        {/* LEFT: sticky form — desktop only */}
        <div className="hidden lg:block sticky top-6">
          {!isEditing && (
            <div className="flex gap-1.5 mb-3">
              <button className={`btn btn-sm flex-1 justify-center rounded ${mode === "single" ? "btn-primary" : ""}`} onClick={() => setMode("single")}>
                <Plus size={12} /> เพิ่มทีละข้อ
              </button>
              <button className={`btn btn-sm flex-1 justify-center rounded ${mode === "bulk" ? "btn-primary" : ""}`} onClick={() => setMode("bulk")}>
                📋 วางหลายข้อ
              </button>
            </div>
          )}
          <FormContent {...formProps} />
        </div>

        {/* RIGHT: question list */}
        <div>
          <h2 className="text-sm font-bold mb-3 text-gray-500">รายการข้อสอบ ({questions.length} ข้อ)</h2>
          {questions.length === 0 ? (
            <div className="card rounded text-center py-12 px-5 text-gray-400">
              <p className="text-2xl mb-2">📝</p>
              <p className="text-sm">ยังไม่มีข้อสอบ</p>
              <p className="text-xs mt-1">กด <strong>เพิ่ม</strong> เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {questions.map((q, i) => (
                <QuestionItem
                  key={q.id} question={q} index={i}
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

/* ──────────────────────────────── Form Content ─────────────────────────── */
interface FormProps {
  isEditing: boolean
  editingQuestion: Question | null
  questions: Question[]
  mode: "single" | "bulk"
  setMode: (m: "single" | "bulk") => void
  type: QuestionType
  setType: (t: QuestionType) => void
  questionText: string
  setQuestionText: (v: string) => void
  options: { label: string; text: string }[]
  setOptions: React.Dispatch<React.SetStateAction<{ label: string; text: string }[]>>
  correctIndex: number
  setCorrectIndex: (i: number) => void
  fillAnswer: string
  setFillAnswer: (v: string) => void
  points: number
  setPoints: (n: number) => void
  saving: boolean
  bulkText: string
  setBulkText: (v: string) => void
  parsedBulk: Partial<Question>[]
  bulkImporting: boolean
  onSave: (andContinue?: boolean) => void
  onImportBulk: () => void
  onCancel: () => void
}

function FormContent(props: FormProps) {
  const { isEditing, mode } = props
  if (isEditing || mode === "single") return <SingleForm {...props} />
  return <BulkForm {...props} />
}

function SingleForm({
  isEditing, editingQuestion, questions,
  type, setType, questionText, setQuestionText,
  options, setOptions, correctIndex, setCorrectIndex,
  fillAnswer, setFillAnswer, points, setPoints,
  saving, onSave, onCancel,
}: FormProps) {
  return (
    <div className="card rounded p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold">{isEditing ? "✏️ แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}</h3>
          {isEditing && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              ข้อ {questions.findIndex(q => q.id === editingQuestion?.id) + 1}
            </p>
          )}
        </div>
        {isEditing && (
          <button className="btn btn-icon btn-ghost rounded" onClick={onCancel}><X size={14} /></button>
        )}
      </div>

      {/* Type tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {(["mcq", "fill", "essay"] as QuestionType[]).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`btn btn-sm justify-center rounded text-xs ${type === t ? "btn-primary" : ""}`}
          >
            {LABEL_MAP[t]}
          </button>
        ))}
      </div>

      {/* Question text */}
      <textarea
        className="input rounded resize-y text-sm"
        rows={3}
        placeholder="คำถาม..."
        value={questionText}
        onChange={e => setQuestionText(e.target.value)}
      />

      {/* MCQ options */}
      {type === "mcq" && (
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio" name="correct_opt"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="shrink-0 accent-blue-600"
              />
              <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center text-[11px] font-bold border
                ${correctIndex === i ? "bg-green-50 text-green-600 border-green-300" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                {opt.label}
              </div>
              <input
                className="input rounded text-sm flex-1 min-w-0"
                value={opt.text}
                onChange={e => setOptions(p => p.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                placeholder={`ตัวเลือก ${opt.label}`}
              />
            </div>
          ))}
          <p className="text-[11px] text-green-600">
            ✓ คำตอบที่ถูก: ตัวเลือก {options[correctIndex]?.label}
          </p>
        </div>
      )}

      {/* Fill answer */}
      {type === "fill" && (
        <input
          className="input rounded text-sm"
          placeholder="คำตอบที่ถูกต้อง..."
          value={fillAnswer}
          onChange={e => setFillAnswer(e.target.value)}
        />
      )}

      {/* Essay hint */}
      {type === "essay" && (
        <div className="rounded px-3 py-2 text-[11px] bg-amber-50 text-amber-600 border border-amber-200">
          อัตนัย: ครูตรวจให้คะแนนเอง ไม่มีคำตอบอัตโนมัติ
        </div>
      )}

      {/* Points */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 shrink-0">คะแนน:</label>
        <input
          type="number" min={1}
          className="input rounded w-16 text-sm"
          value={points}
          onChange={e => setPoints(Number(e.target.value))}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isEditing ? (
          <>
            <button className="btn btn-primary w-full justify-center rounded" onClick={() => onSave(false)} disabled={saving}>
              {saving ? <><div className="spinner" />บันทึก...</> : "บันทึกการแก้ไข"}
            </button>
            <button className="btn w-full justify-center rounded" onClick={onCancel}>ยกเลิก</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary w-full justify-center rounded" onClick={() => onSave(false)} disabled={saving}>
              {saving ? <><div className="spinner" />บันทึก...</> : "บันทึก"}
            </button>
            <button
              className="btn w-full justify-center rounded font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
              onClick={() => onSave(true)} disabled={saving}
            >
              <Plus size={11} /> บันทึก & เพิ่มข้อต่อไป
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BulkForm({ bulkText, setBulkText, parsedBulk, bulkImporting, onImportBulk }: FormProps) {
  return (
    <div className="card rounded p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-[13px] font-bold mb-1">📋 วางข้อสอบปรนัยหลายข้อ</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          แต่ละข้อคั่นด้วยบรรทัดว่าง ใส่ <strong>*</strong> หลังตัวเลือกที่ถูก
        </p>
      </div>
      <div className="rounded px-3 py-2 text-[11px] font-mono leading-loose bg-gray-100 text-gray-500 border border-gray-200 whitespace-pre">
        {`1. คำถามข้อ 1\nA. ตัวเลือก ก\nB. ตัวเลือก ข*\nC. ตัวเลือก ค`}
      </div>
      <textarea
        className="input rounded font-mono text-xs resize-y"
        rows={10}
        value={bulkText}
        onChange={e => setBulkText(e.target.value)}
        placeholder={"1. คำถามข้อ 1\nA. ตัวเลือก A\nB. ตัวเลือก B*\nC. ตัวเลือก C\nD. ตัวเลือก D\n\n2. คำถามข้อ 2\n..."}
      />
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-semibold ${parsedBulk.length > 0 ? "text-green-600" : "text-gray-400"}`}>
          {parsedBulk.length > 0 ? `✓ ตรวจพบ ${parsedBulk.length} ข้อ` : "ยังไม่มีข้อสอบ"}
        </p>
      </div>
      <button
        className="btn btn-primary w-full justify-center rounded"
        onClick={onImportBulk}
        disabled={!bulkText.trim() || bulkImporting}
      >
        {bulkImporting ? <><div className="spinner" />กำลังนำเข้า...</> : `นำเข้า ${parsedBulk.length} ข้อ`}
      </button>
    </div>
  )
}

/* ──────────────────────────────── Question Item ─────────────────────────── */
function QuestionItem({ question: q, index, isEditing, onEdit, onDelete }: {
  question: Question
  index: number
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const type = q.type as QuestionType
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.mcq

  return (
    <div className={`rounded border overflow-hidden transition-all ${isEditing ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}
      style={{ background: "var(--surface)" }}>

      {/* Row */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(p => !p)}>
        <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center text-[11px] font-bold border mt-0.5 ${s.bg} ${s.text} ${s.border}`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-snug break-words">{q.question_text}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${s.bg} ${s.text} ${s.border}`}>
              {LABEL_MAP[type]}
            </span>
            <span className="text-[10px] text-gray-400">{q.points} คะแนน</span>
            {isEditing && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">กำลังแก้ไข</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button className="btn btn-icon btn-ghost w-7 h-7 rounded" onClick={onEdit} title="แก้ไข"><Edit2 size={12} /></button>
          <button className="btn btn-icon btn-ghost w-7 h-7 rounded" onClick={() => setExpanded(p => !p)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button className="btn btn-icon btn-danger w-7 h-7 rounded" onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
          {q.type === "mcq" && q.options && (q.options as QuizOption[]).map((opt, oi) => {
            const isCorrect = String(oi) === String(q.correct_answer)
            return (
              <div key={oi} className={`text-xs px-2.5 py-1 rounded border ${isCorrect ? "bg-green-50 text-green-700 border-green-300 font-bold" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                {opt.label}. {opt.text}{isCorrect && " ✓"}
              </div>
            )
          })}
          {q.type === "fill" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-300">
              ✓ คำตอบ: {q.correct_answer}
            </span>
          )}
          {q.type === "essay" && <span className="text-xs text-gray-400">ตรวจโดยครู</span>}
        </div>
      )}
    </div>
  )
}