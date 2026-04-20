"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Clock, ToggleLeft, ToggleRight, Edit2, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import type { Quiz, Question, QuizOption } from "@/types/quiz"
import clsx from "clsx"

interface QuizRow extends Omit<Quiz, 'questions'> { questions: { count: number }[] }

export default function AdminQuizzesClient({ quizzes: init }: { quizzes: QuizRow[] }) {
  const [quizzes, setQuizzes] = useState(init)
  const [modal, setModal] = useState<{ mode:"add"|"edit"; quiz?: QuizRow }|null>(null)
  const [qModal, setQModal] = useState<{ quizId:string; quizTitle:string }|null>(null)
  const supabase = createClient()

  async function toggleOpen(quiz: QuizRow) {
    await supabase.from("quizzes").update({ is_open: !quiz.is_open }).eq("id", quiz.id)
    setQuizzes(p => p.map(q => q.id===quiz.id ? {...q, is_open:!quiz.is_open} : q))
    toast.success(quiz.is_open ? "ปิดแล้ว" : "เปิดแล้ว")
  }

  async function deleteQuiz(id: string) {
    if (!confirm("ยืนยันการลบ?")) return
    await supabase.from("quizzes").delete().eq("id", id)
    setQuizzes(p => p.filter(q => q.id!==id))
    toast.success("ลบแล้ว")
  }

  async function onSaved(quiz: QuizRow) {
    if (modal?.mode==="add") setQuizzes(p => [quiz, ...p])
    else setQuizzes(p => p.map(q => q.id===quiz.id ? quiz : q))
    setModal(null)
    toast.success("บันทึกแล้ว ✓")
  }

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:17, fontWeight:700 }}>จัดการแบบทดสอบ</h1>
          <p style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>{quizzes.length} ชุด</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode:"add" })}>
          <Plus size={14} /> สร้างแบบทดสอบ
        </button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {quizzes.map(q => (
          <div key={q.id} className="card">
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <h3 style={{ fontWeight:700, fontSize:15 }}>{q.title}</h3>
                  <span className={`badge ${q.is_open ? "badge-green" : "badge-red"}`}>{q.is_open ? "เปิด" : "ปิด"}</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:12, color:"var(--text-2)" }}>
                  <span>📝 {q.questions?.[0]?.count ?? 0} ข้อ</span>
                  <span>🎯 ผ่าน {q.pass_score}%</span>
                  {q.time_limit && <span style={{ display:"flex", alignItems:"center", gap:3 }}><Clock size={11} /> {q.time_limit} นาที</span>}
                  {q.opens_at && <span>📅 {new Date(q.opens_at).toLocaleDateString("th-TH")} – {new Date(q.closes_at!).toLocaleDateString("th-TH")}</span>}
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, flexShrink:0 }}>
                <button className="btn btn-sm" onClick={() => toggleOpen(q)} style={{ color: q.is_open ? "var(--green)" : "var(--text-3)" }}>
                  {q.is_open ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                  {q.is_open ? "ปิด" : "เปิด"}
                </button>
                <button className="btn btn-sm" onClick={() => setQModal({ quizId:q.id, quizTitle:q.title })}>
                  <Edit2 size={12}/> จัดการข้อสอบ
                </button>
                <button className="btn btn-sm" onClick={() => setModal({ mode:"edit", quiz:q })}>แก้ไข</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteQuiz(q.id)}><Trash2 size={12}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && <QuizFormModal mode={modal.mode} quiz={modal.quiz} onClose={() => setModal(null)} onSaved={onSaved} />}
      {qModal && <QuestionManagerModal quizId={qModal.quizId} quizTitle={qModal.quizTitle} onClose={() => setQModal(null)} />}
    </div>
  )
}

function QuizFormModal({ mode, quiz, onClose, onSaved }: { mode:"add"|"edit"; quiz?:QuizRow; onClose:()=>void; onSaved:(q:QuizRow)=>void }) {
  const [form, setForm] = useState({
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    pass_score: quiz?.pass_score ?? 60,
    time_limit: quiz?.time_limit ?? "",
    is_open: quiz?.is_open ?? false,
    opens_at: quiz?.opens_at ? quiz.opens_at.slice(0,16) : "",
    closes_at: quiz?.closes_at ? quiz.closes_at.slice(0,16) : "",
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
    if (mode==="add") {
      ;({ data, error } = await supabase.from("quizzes").insert(payload).select("*, questions(count)").single())
    } else {
      ;({ data, error } = await supabase.from("quizzes").update(payload).eq("id", quiz!.id).select("*, questions(count)").single())
    }
    if (error || !data) { toast.error("บันทึกไม่สำเร็จ"); setSaving(false); return }
    onSaved(data); setSaving(false)
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:"100vh", background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"var(--surface)", borderRadius:20, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid var(--border)" }}>
          <h3 style={{ fontWeight:700, fontSize:16 }}>{mode==="add" ? "สร้างแบบทดสอบ" : "แก้ไขแบบทดสอบ"}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div><label className="form-label">ชื่อแบบทดสอบ *</label><input className="input" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} /></div>
          <div><label className="form-label">คำอธิบาย</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} style={{ resize:"vertical" }} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label className="form-label">คะแนนผ่าน (%)</label><input type="number" min={0} max={100} className="input" value={form.pass_score} onChange={e => setForm(p=>({...p,pass_score:Number(e.target.value)}))} /></div>
            <div><label className="form-label">เวลา (นาที, เว้นว่าง=ไม่จำกัด)</label><input type="number" min={0} className="input" value={form.time_limit} onChange={e => setForm(p=>({...p,time_limit:e.target.value}))} placeholder="ไม่จำกัด" /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label className="form-label">วันเปิด</label><input type="datetime-local" className="input" value={form.opens_at} onChange={e => setForm(p=>({...p,opens_at:e.target.value}))} /></div>
            <div><label className="form-label">วันปิด</label><input type="datetime-local" className="input" value={form.closes_at} onChange={e => setForm(p=>({...p,closes_at:e.target.value}))} /></div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={form.is_open} onChange={e => setForm(p=>({...p,is_open:e.target.checked}))} />
            เปิดให้ทำแบบทดสอบทันที
          </label>
        </div>
        <div style={{ padding:"14px 24px", borderTop:"1px solid var(--border)", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><div className="spinner"/>บันทึก...</> : "บันทึก"}</button>
        </div>
      </div>
    </div>
  )
}

function QuestionManagerModal({ quizId, quizTitle, onClose }: { quizId:string; quizTitle:string; onClose:()=>void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkMode, setBulkMode] = useState(false)
  const supabase = createClient()

  useState(() => {
    supabase.from("questions").select("*").eq("quiz_id", quizId).order("sort_order").then(({ data }) => {
      setQuestions(data ?? [])
      setLoading(false)
    })
  })

  async function deleteQ(id: string) {
    await supabase.from("questions").delete().eq("id", id)
    setQuestions(p => p.filter(q => q.id!==id))
    toast.success("ลบแล้ว")
  }

  function parseBulkMCQ(text: string): Partial<Question>[] {
    const blocks = text.trim().split(/\n{2,}/)
    return blocks.map((block, i) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
      const question_text = lines[0].replace(/^\d+\.\s*/, "")
      const options: QuizOption[] = []
      let correct_answer = "0"
      lines.slice(1).forEach(line => {
        const m = line.match(/^([A-Da-d])[\.\)]\s*(.+)/)
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65
          options.push({ label: m[1].toUpperCase(), text: m[2].replace(/\*$/, "").trim() })
          if (line.includes("*")) correct_answer = String(idx)
        }
      })
      return { type:"mcq" as const, question_text, options, correct_answer, sort_order:i, quiz_id:quizId, points:1 }
    }).filter(q => q.question_text)
  }

  async function importBulk() {
    const parsed = parseBulkMCQ(bulkText)
    if (!parsed.length) { toast.error("ไม่พบข้อสอบ"); return }
    const { data, error } = await supabase.from("questions").insert(parsed).select()
    if (error) { toast.error("นำเข้าไม่สำเร็จ"); return }
    setQuestions(p => [...p, ...(data??[])])
    setBulkText(""); setBulkMode(false)
    toast.success(`นำเข้า ${data?.length} ข้อ ✓`)
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:"100vh", background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"var(--surface)", borderRadius:20, width:"100%", maxWidth:680, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <div>
            <h3 style={{ fontWeight:700, fontSize:15 }}>จัดการข้อสอบ</h3>
            <p style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{quizTitle} · {questions.length} ข้อ</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setAddForm(true); setBulkMode(false) }}><Plus size={12}/> เพิ่มข้อ</button>
            <button className="btn btn-sm" onClick={() => { setBulkMode(true); setAddForm(false) }}>📋 วางข้อสอบทั้งหมด</button>
          </div>

          {bulkMode && (
            <div style={{ background:"#F8F9FA", borderRadius:12, padding:16, marginBottom:16, border:"1px solid var(--border)" }}>
              <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>วางข้อสอบปรนัย (ใส่ * หลังตัวเลือกที่ถูก)</p>
              <p style={{ fontSize:11, color:"var(--text-3)", marginBottom:8 }}>เช่น: A. go  B. goes*  C. going  D. gone</p>
              <textarea className="input" rows={7} value={bulkText} onChange={e => setBulkText(e.target.value)}
                style={{ fontFamily:"monospace", fontSize:12, resize:"vertical" }}
                placeholder={"1. She ___ to school.\nA. go\nB. goes*\nC. going\nD. gone\n\n2. ..."} />
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <button className="btn btn-sm" onClick={() => setBulkMode(false)}>ยกเลิก</button>
                <button className="btn btn-primary btn-sm" onClick={importBulk}>นำเข้า</button>
              </div>
            </div>
          )}

          {addForm && (
            <AddQuestionForm quizId={quizId} sortOrder={questions.length}
              onSaved={q => { setQuestions(p => [...p, q]); setAddForm(false) }}
              onCancel={() => setAddForm(false)} />
          )}

          {loading ? <p style={{ color:"var(--text-3)", fontSize:13 }}>กำลังโหลด...</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {questions.length===0 && <p style={{ color:"var(--text-3)", fontSize:13, textAlign:"center", padding:"24px 0" }}>ยังไม่มีข้อสอบ</p>}
              {questions.map((q, i) => (
                <div key={q.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", border:"1px solid var(--border)", borderRadius:10 }}>
                  <div style={{ width:26, height:26, borderRadius:7, background:q.type==="mcq"?"var(--blue-light)":q.type==="fill"?"var(--green-light)":"var(--amber-light)", color:q.type==="mcq"?"var(--blue)":q.type==="fill"?"var(--green)":"var(--amber)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.5, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as React.CSSProperties["WebkitBoxOrient"] }}>{q.question_text}</p>
                    <span className={`badge ${q.type==="mcq"?"badge-blue":q.type==="fill"?"badge-green":"badge-amber"}`} style={{ marginTop:4 }}>
                      {q.type==="mcq"?"ปรนัย":q.type==="fill"?"เติมคำ":"อัตนัย"}
                    </span>
                  </div>
                  <button className="btn btn-sm btn-danger" style={{ flexShrink:0 }} onClick={() => deleteQ(q.id)}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddQuestionForm({ quizId, sortOrder, onSaved, onCancel }: { quizId:string; sortOrder:number; onSaved:(q:Question)=>void; onCancel:()=>void }) {
  const [type, setType] = useState<"mcq"|"fill"|"essay">("mcq")
  const [questionText, setQuestionText] = useState("")
  const [options, setOptions] = useState([{ label:"A", text:"" },{ label:"B", text:"" },{ label:"C", text:"" },{ label:"D", text:"" }])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [fillAnswer, setFillAnswer] = useState("")
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    if (!questionText.trim()) { toast.error("กรุณาใส่คำถาม"); return }
    setSaving(true)
    const payload: Partial<Question> = {
      quiz_id:quizId, type, question_text:questionText,
      options: type==="mcq" ? options : null,
      correct_answer: type==="mcq" ? String(correctIndex) : type==="fill" ? fillAnswer : null,
      points, sort_order:sortOrder,
    }
    const { data, error } = await supabase.from("questions").insert(payload).select().single()
    if (error || !data) { toast.error("เพิ่มไม่สำเร็จ"); setSaving(false); return }
    onSaved(data); setSaving(false)
  }

  return (
    <div style={{ background:"var(--blue-light)", borderRadius:12, padding:16, marginBottom:16, border:"1px solid rgba(37,99,235,0.2)" }}>
      <p style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>เพิ่มข้อสอบใหม่</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10 }}>
        {(["mcq","fill","essay"] as const).map(t => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-sm ${type===t ? "btn-primary" : ""}`} style={{ justifyContent:"center" }}>
            {t==="mcq"?"ปรนัย":t==="fill"?"เติมคำ":"อัตนัย"}
          </button>
        ))}
      </div>
      <textarea className="input" rows={2} placeholder="คำถาม..." value={questionText} onChange={e => setQuestionText(e.target.value)} style={{ marginBottom:10, resize:"vertical" }} />
      {type==="mcq" && options.map((opt, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
          <input type="radio" name="correct" checked={correctIndex===i} onChange={() => setCorrectIndex(i)} />
          <span style={{ fontSize:12, fontWeight:700, width:20 }}>{opt.label}.</span>
          <input className="input" style={{ fontSize:13 }} value={opt.text} onChange={e => setOptions(p => p.map((o,j) => j===i ? {...o,text:e.target.value} : o))} placeholder={`ตัวเลือก ${opt.label}`} />
        </div>
      ))}
      {type==="fill" && <input className="input" style={{ marginBottom:10 }} placeholder="คำตอบที่ถูกต้อง..." value={fillAnswer} onChange={e => setFillAnswer(e.target.value)} />}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <label style={{ fontSize:12, color:"var(--text-2)" }}>คะแนน:</label>
        <input type="number" min={1} className="input" style={{ width:70 }} value={points} onChange={e => setPoints(Number(e.target.value))} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button className="btn btn-sm" onClick={onCancel}>ยกเลิก</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "บันทึก..." : "เพิ่มข้อ"}</button>
      </div>
    </div>
  )
}
