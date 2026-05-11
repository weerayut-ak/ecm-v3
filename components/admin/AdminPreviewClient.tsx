"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Eye, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import type { Question, QuizOption, Quiz } from "@/types/quiz"

interface AdminPreviewClientProps {
  quiz: Quiz
  questions: Question[]
}

export default function AdminPreviewClient({ quiz, questions }: AdminPreviewClientProps) {
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [fillInput, setFillInput]   = useState("")
  const [timeLeft, setTimeLeft]     = useState(quiz.time_limit ? quiz.time_limit * 60 : null)
  const [submitted, setSubmitted]   = useState(false)
  const [navOpen, setNavOpen]       = useState(false) // mobile navigator drawer
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!timeLeft || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p === null || p <= 1) { clearInterval(timerRef.current!); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [submitted])

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  const currentQ    = questions[currentIdx]
  const totalQ      = questions.length
  const answered    = Object.keys(answers).length
  const timerDanger = timeLeft !== null && timeLeft < 60

  function select(val: string) {
    if (!currentQ) return
    setAnswers(p => ({ ...p, [currentQ.id]: val }))
  }

  function goNext() {
    if (currentQ?.type === "fill" && fillInput.trim())
      setAnswers(p => ({ ...p, [currentQ.id]: fillInput }))
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(p => p + 1)
      setFillInput(answers[questions[currentIdx + 1]?.id] ?? "")
    }
    setNavOpen(false)
  }

  function goPrev() {
    if (currentIdx > 0) {
      setCurrentIdx(p => p - 1)
      setFillInput(answers[questions[currentIdx - 1]?.id] ?? "")
    }
    setNavOpen(false)
  }

  function jump(idx: number) {
    setCurrentIdx(idx)
    setFillInput(answers[questions[idx]?.id] ?? "")
    setNavOpen(false)
  }

  function submit() {
    setSubmitted(true)
    clearInterval(timerRef.current!)
  }

  function restart() {
    setSubmitted(false); setAnswers({}); setCurrentIdx(0)
    setFillInput(""); setNavOpen(false)
    setTimeLeft(quiz.time_limit ? quiz.time_limit * 60 : null)
  }

  const score      = questions.reduce((s, q) => q.type !== "mcq" ? s : answers[q.id] === q.correct_answer ? s + (q.points ?? 1) : s, 0)
  const maxScore   = questions.reduce((s, q) => s + (q.points ?? 1), 0)
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed     = percentage >= (quiz.pass_score ?? 60)

  return (
    <div className="max-w-[900px] mx-auto px-3 sm:px-4 py-4">

      {/* ── Back ── */}
      <button
        className="btn btn-sm btn-ghost flex items-center gap-1.5 rounded mb-3"
        onClick={() => router.back()}
      >
        <ArrowLeft size={13} /> กลับ
      </button>

      {/* ── Preview banner ── */}
      <div className="flex items-start gap-2.5 px-3 sm:px-4 py-3 rounded border-2 border-dashed border-amber-400 bg-amber-50 mb-4">
        <Eye size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-600">โหมดพรีวิว — ผู้ดูแลระบบเท่านั้น</p>
          <p className="text-[11px] text-gray-500 mt-0.5">คำตอบที่กดจะไม่ถูกบันทึกจริง</p>
        </div>
      </div>

      {/* ── Quiz header card ── */}
      <div className="card rounded p-4 sm:p-5 mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold mb-1">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-gray-400 mb-2 leading-relaxed">{quiz.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>📝 {totalQ} ข้อ</span>
              <span>🎯 ผ่าน {quiz.pass_score}%</span>
              {quiz.time_limit && <span className="flex items-center gap-1"><Clock size={11} />{quiz.time_limit} นาที</span>}
            </div>
          </div>
          {/* Timer */}
          {timeLeft !== null && !submitted && (
            <div className={`rounded border-2 px-3 py-2 text-center shrink-0 ${timerDanger ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
              <p className={`text-[10px] mb-0.5 ${timerDanger ? "text-red-500" : "text-gray-400"}`}>เวลาที่เหลือ</p>
              <p className={`text-2xl font-extrabold tabular-nums ${timerDanger ? "text-red-600" : "text-gray-800"}`}>
                {fmt(timeLeft)}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>ตอบแล้ว {answered}/{totalQ} ข้อ</span>
              <span>{Math.round((answered / totalQ) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded transition-all duration-300"
                style={{ width: `${(answered / totalQ) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── SUBMITTED: result ── */}
      {submitted ? (
        <div className="card rounded p-6 sm:p-10 text-center">
          <div className="text-5xl mb-3">{passed ? "🎉" : "😔"}</div>
          <h2 className="text-xl font-bold mb-1">{passed ? "ผ่านแบบทดสอบ!" : "ยังไม่ผ่าน"}</h2>
          <p className="text-sm text-gray-500 mb-4">
            ได้คะแนน {score} / {maxScore} คะแนน ({percentage}%)
          </p>
          <span className={`inline-block rounded px-5 py-2 text-sm font-bold border mb-6
            ${passed ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-200"}`}>
            {passed ? `✓ ผ่าน (เกณฑ์ ${quiz.pass_score}%)` : `✗ ไม่ผ่าน (เกณฑ์ ${quiz.pass_score}%)`}
          </span>

          {/* Answer review */}
          <div className="text-left mt-2">
            <h3 className="text-sm font-bold mb-3">เฉลย</h3>
            <div className="flex flex-col gap-2.5">
              {questions.map((q, i) => {
                const userAns   = answers[q.id]
                const isCorrect = q.type === "mcq" ? userAns === q.correct_answer
                  : q.type === "fill" ? userAns?.toLowerCase().trim() === (q.correct_answer ?? "").toLowerCase().trim()
                  : null
                return (
                  <div key={q.id}
                    className={`rounded border p-3 ${isCorrect === true ? "bg-green-50/60 border-green-200" : isCorrect === false ? "bg-red-50/60 border-red-200" : "border-gray-200"}`}>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-sm font-bold shrink-0">ข้อ {i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-2">{q.question_text}</p>
                        {q.type === "mcq" && q.options && (
                          <div className="flex flex-wrap gap-1.5">
                            {(q.options as QuizOption[]).map((opt, oi) => {
                              const isSel  = userAns === String(oi)
                              const isCor  = q.correct_answer === String(oi)
                              return (
                                <span key={oi}
                                  className={`text-[11px] px-2 py-0.5 rounded border font-medium
                                    ${isCor ? "bg-green-50 text-green-700 border-green-300 font-bold"
                                      : isSel ? "bg-red-50 text-red-600 border-red-200"
                                      : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                  {opt.label}. {opt.text}{isCor ? " ✓" : isSel && !isCor ? " ✗" : ""}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {q.type === "fill" && (
                          <p className="text-xs text-gray-600">
                            คำตอบของคุณ: <strong>{userAns ?? "(ไม่ตอบ)"}</strong>
                            {" "}| เฉลย: <strong className="text-green-700">{q.correct_answer}</strong>
                          </p>
                        )}
                        {q.type === "essay" && (
                          <p className="text-xs text-gray-400">คำตอบ: {userAns ?? "(ไม่ตอบ)"}</p>
                        )}
                      </div>
                      <span className="text-base shrink-0">{isCorrect === true ? "✅" : isCorrect === false ? "❌" : "📝"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <button className="btn btn-primary rounded mt-6 mx-auto" onClick={restart}>ทำอีกครั้ง (พรีวิว)</button>
        </div>
      ) : (
        /* ── QUIZ BODY ── */
        <>
          {/* Mobile: navigator toggle bar */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <div className="flex gap-1">
              <button className="btn btn-sm rounded flex items-center gap-1" onClick={goPrev} disabled={currentIdx === 0}>
                <ChevronLeft size={13} /> ก่อนหน้า
              </button>
              <button className="btn btn-sm rounded flex items-center gap-1" onClick={goNext} disabled={currentIdx === totalQ - 1}>
                ถัดไป <ChevronRight size={13} />
              </button>
            </div>
            <button
              className="btn btn-sm rounded flex items-center gap-1 text-blue-600"
              onClick={() => setNavOpen(p => !p)}
            >
              ข้อ {currentIdx + 1}/{totalQ}
            </button>
          </div>

          {/* Mobile: navigator drawer */}
          {navOpen && (
            <div className="mb-3 card rounded p-3 lg:hidden">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mb-3">
                {questions.map((q, i) => {
                  const isAns = !!answers[q.id]; const isCur = i === currentIdx
                  return (
                    <button key={q.id} onClick={() => jump(i)}
                      className={`aspect-square rounded text-xs font-bold border transition-colors
                        ${isCur ? "bg-blue-600 text-white border-blue-600"
                          : isAns ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-white text-gray-500 border-gray-200"}`}>
                      {i + 1}
                    </button>
                  )
                })}
              </div>
              <button className="btn btn-primary btn-sm w-full justify-center rounded" onClick={submit}>
                <CheckCircle2 size={12} /> ส่งคำตอบ
              </button>
            </div>
          )}

          {/* Desktop: 2-column */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-3 items-start">

            {/* Question card */}
            {currentQ && (
              <div className="card rounded p-4 sm:p-5">
                {/* Question header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                    {currentIdx + 1}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">ข้อที่ {currentIdx + 1} จาก {totalQ}</p>
                    <p className="text-[11px] text-gray-400">
                      {currentQ.type === "mcq" ? "ปรนัย" : currentQ.type === "fill" ? "เติมคำ" : "อัตนัย"} · {currentQ.points} คะแนน
                    </p>
                  </div>
                </div>

                <p className="text-base sm:text-[15px] font-semibold leading-relaxed mb-5">
                  {currentQ.question_text}
                </p>

                {/* MCQ */}
                {currentQ.type === "mcq" && currentQ.options && (
                  <div className="flex flex-col gap-2.5">
                    {(currentQ.options as QuizOption[]).map((opt, oi) => {
                      const sel = answers[currentQ.id] === String(oi)
                      return (
                        <button key={oi} onClick={() => select(String(oi))}
                          className={`flex items-center gap-3 p-3 rounded border-2 text-left transition-all cursor-pointer w-full
                            ${sel ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                          <div className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs font-bold border
                            ${sel ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {opt.label}
                          </div>
                          <span className="text-sm">{opt.text}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Fill */}
                {currentQ.type === "fill" && (
                  <input
                    className="input rounded text-base"
                    placeholder="พิมพ์คำตอบ..."
                    value={fillInput}
                    onChange={e => { setFillInput(e.target.value); setAnswers(p => ({ ...p, [currentQ.id]: e.target.value })) }}
                    autoFocus
                  />
                )}

                {/* Essay */}
                {currentQ.type === "essay" && (
                  <textarea
                    className="input rounded resize-y text-sm"
                    rows={5}
                    placeholder="เขียนคำตอบของคุณที่นี่..."
                    value={answers[currentQ.id] ?? ""}
                    onChange={e => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                  />
                )}

                {/* Navigation (bottom of question card) */}
                <div className="flex items-center justify-between mt-5">
                  <button className="btn btn-sm rounded flex items-center gap-1" onClick={goPrev} disabled={currentIdx === 0}>
                    <ChevronLeft size={13} /> ก่อนหน้า
                  </button>
                  {currentIdx === totalQ - 1 ? (
                    <button className="btn btn-primary rounded flex items-center gap-1.5" onClick={submit}>
                      <CheckCircle2 size={14} /> ส่งคำตอบ
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm rounded flex items-center gap-1" onClick={goNext}>
                      ถัดไป <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Desktop: navigator sidebar */}
            <div className="hidden lg:block card rounded p-3 sticky top-6">
              <p className="text-xs font-bold mb-2.5 text-gray-500">เลือกข้อ</p>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {questions.map((q, i) => {
                  const isAns = !!answers[q.id]; const isCur = i === currentIdx
                  return (
                    <button key={q.id} onClick={() => jump(i)}
                      className={`aspect-square rounded text-[11px] font-bold border transition-colors
                        ${isCur ? "bg-blue-600 text-white border-blue-600"
                          : isAns ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                      {i + 1}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-1.5 text-[11px] text-gray-500 mb-3">
                {[
                  { cls: "bg-blue-600", label: "ข้อปัจจุบัน" },
                  { cls: "bg-green-50 border border-green-300", label: "ตอบแล้ว" },
                  { cls: "bg-white border border-gray-200", label: "ยังไม่ตอบ" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${cls}`} />
                    {label}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-2.5">
                <p className="text-[11px] text-gray-400 mb-2">ตอบแล้ว {answered}/{totalQ}</p>
                <button className="btn btn-primary btn-sm w-full justify-center rounded" onClick={submit}>
                  <CheckCircle2 size={11} /> ส่งคำตอบ
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}