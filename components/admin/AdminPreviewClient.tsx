"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Eye, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import type { Question, QuizOption } from "@/types/quiz"
import type { Quiz } from "@/types/quiz"

interface AdminPreviewClientProps {
  quiz: Quiz
  questions: Question[]
}

export default function AdminPreviewClient({ quiz, questions }: AdminPreviewClientProps) {
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fillInput, setFillInput] = useState("")
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit ? quiz.time_limit * 60 : null)
  const [submitted, setSubmitted] = useState(false)
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

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const currentQ = questions[currentIdx]
  const answeredCount = Object.keys(answers).length
  const totalQ = questions.length

  function selectAnswer(value: string) {
    if (!currentQ) return
    setAnswers(p => ({ ...p, [currentQ.id]: value }))
  }

  function handleNext() {
    if (currentQ?.type === "fill" && fillInput.trim()) {
      setAnswers(p => ({ ...p, [currentQ.id]: fillInput }))
    }
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(p => p + 1)
      setFillInput(answers[questions[currentIdx + 1]?.id] ?? "")
    }
  }

  function handlePrev() {
    if (currentIdx > 0) {
      setCurrentIdx(p => p - 1)
      setFillInput(answers[questions[currentIdx - 1]?.id] ?? "")
    }
  }

  function handleJump(idx: number) {
    setCurrentIdx(idx)
    setFillInput(answers[questions[idx]?.id] ?? "")
  }

  function handleSubmit() {
    setSubmitted(true)
    clearInterval(timerRef.current!)
  }

  const score = questions.reduce((sum, q) => {
    if (q.type !== "mcq") return sum
    return answers[q.id] === q.correct_answer ? sum + (q.points ?? 1) : sum
  }, 0)
  const maxScore = questions.reduce((sum, q) => sum + (q.points ?? 1), 0)
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = percentage >= (quiz.pass_score ?? 60)
  const timerDanger = timeLeft !== null && timeLeft < 60

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Admin Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 5, borderRadius: 4 }}
        >
          <ArrowLeft size={13} /> กลับ
        </button>
      </div>

      {/* ── Preview Banner ── */}
      <div style={{
        padding: "10px 18px",
        borderRadius: 6,
        marginBottom: 16,
        background: "rgba(217,119,6,0.08)",
        border: "1.5px dashed var(--amber)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <Eye size={15} style={{ color: "var(--amber)", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>
            โหมดพรีวิว — ผู้ดูแลระบบเท่านั้น
          </p>
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>
            นี่คือตัวอย่างหน้าทำข้อสอบของนักเรียน คำตอบที่กดจะไม่ถูกบันทึกจริง
          </p>
        </div>
      </div>

      {/* ── Quiz Header Card ── */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: 14, borderRadius: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{quiz.title}</h1>
            {quiz.description && (
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8, lineHeight: 1.6 }}>
                {quiz.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-2)", flexWrap: "wrap" }}>
              <span>📝 {totalQ} ข้อ</span>
              <span>🎯 ผ่าน {quiz.pass_score}%</span>
              {quiz.time_limit && <span><Clock size={11} style={{ display: "inline", marginRight: 3 }} />{quiz.time_limit} นาที</span>}
            </div>
          </div>

          {/* Timer */}
          {timeLeft !== null && !submitted && (
            <div style={{
              padding: "10px 16px",
              borderRadius: 6,
              border: `2px solid ${timerDanger ? "var(--red)" : "var(--border)"}`,
              background: timerDanger ? "rgba(220,38,38,0.06)" : "var(--bg-2)",
              textAlign: "center",
              flexShrink: 0,
            }}>
              <p style={{ fontSize: 10, color: timerDanger ? "var(--red)" : "var(--text-3)", marginBottom: 2 }}>
                เวลาที่เหลือ
              </p>
              <p style={{
                fontSize: 24, fontWeight: 800,
                color: timerDanger ? "var(--red)" : "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatTime(timeLeft)}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
              <span>ตอบแล้ว {answeredCount} / {totalQ} ข้อ</span>
              <span>{Math.round((answeredCount / totalQ) * 100)}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(answeredCount / totalQ) * 100}%`,
                background: "var(--blue)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Submitted Result ── */}
      {submitted ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", borderRadius: 6 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {passed ? "🎉" : "😔"}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {passed ? "ผ่านแบบทดสอบ!" : "ยังไม่ผ่าน"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            ได้คะแนน {score} / {maxScore} คะแนน ({percentage}%)
          </p>

          <div style={{
            display: "inline-block",
            padding: "8px 24px",
            borderRadius: 6,
            background: passed ? "var(--green-light)" : "rgba(220,38,38,0.08)",
            color: passed ? "var(--green)" : "var(--red)",
            fontSize: 14, fontWeight: 700,
            marginBottom: 24,
            border: passed ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(220,38,38,0.3)",
          }}>
            {passed ? `✓ ผ่าน (เกณฑ์ ${quiz.pass_score}%)` : `✗ ไม่ผ่าน (เกณฑ์ ${quiz.pass_score}%)`}
          </div>

          {/* Answer review */}
          <div style={{ textAlign: "left", marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>เฉลย</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.map((q, i) => {
                const userAns = answers[q.id]
                const isCorrect = q.type === "mcq" ? userAns === q.correct_answer
                  : q.type === "fill" ? userAns?.toLowerCase().trim() === (q.correct_answer ?? "").toLowerCase().trim()
                  : null

                return (
                  <div key={q.id} style={{
                    padding: "12px 14px", borderRadius: 6,
                    border: `1px solid ${isCorrect === true ? "rgba(22,163,74,0.25)" : isCorrect === false ? "rgba(220,38,38,0.25)" : "var(--border)"}`,
                    background: isCorrect === true ? "rgba(22,163,74,0.04)" : isCorrect === false ? "rgba(220,38,38,0.04)" : "var(--surface)",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>ข้อ {i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, marginBottom: 6 }}>{q.question_text}</p>
                        {q.type === "mcq" && q.options && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {(q.options as QuizOption[]).map((opt, oi) => {
                              const isSelected = userAns === String(oi)
                              const isCorrectOpt = q.correct_answer === String(oi)
                              return (
                                <span key={oi} style={{
                                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                                  background: isCorrectOpt ? "var(--green-light)" : isSelected ? "rgba(220,38,38,0.08)" : "var(--bg-2)",
                                  color: isCorrectOpt ? "var(--green)" : isSelected ? "var(--red)" : "var(--text-3)",
                                  fontWeight: isSelected || isCorrectOpt ? 700 : 400,
                                  border: isCorrectOpt ? "1px solid rgba(22,163,74,0.3)" : isSelected ? "1px solid rgba(220,38,38,0.3)" : "1px solid var(--border)",
                                }}>
                                  {opt.label}. {opt.text}
                                  {isCorrectOpt ? " ✓" : isSelected && !isCorrectOpt ? " ✗" : ""}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {q.type === "fill" && (
                          <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                            คำตอบของคุณ: <strong>{userAns ?? "(ไม่ตอบ)"}</strong>
                            {" "}| เฉลย: <strong style={{ color: "var(--green)" }}>{q.correct_answer}</strong>
                          </p>
                        )}
                        {q.type === "essay" && (
                          <p style={{ fontSize: 12, color: "var(--text-3)" }}>คำตอบ: {userAns ?? "(ไม่ตอบ)"}</p>
                        )}
                      </div>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {isCorrect === true ? "✅" : isCorrect === false ? "❌" : "📝"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 24, justifyContent: "center", borderRadius: 4 }}
            onClick={() => {
              setSubmitted(false)
              setAnswers({})
              setCurrentIdx(0)
              setFillInput("")
              setTimeLeft(quiz.time_limit ? quiz.time_limit * 60 : null)
            }}
          >
            ทำอีกครั้ง (พรีวิว)
          </button>
        </div>
      ) : (
        /* ── Quiz Body ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14, alignItems: "start" }}>

          {/* Question Card */}
          {currentQ && (
            <div className="card" style={{ padding: "20px 22px", borderRadius: 6 }}>

              {/* Question number */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: "var(--blue)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                }}>
                  {currentIdx + 1}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>ข้อที่ {currentIdx + 1} จาก {totalQ}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {currentQ.type === "mcq" ? "ปรนัย" : currentQ.type === "fill" ? "เติมคำ" : "อัตนัย"} · {currentQ.points} คะแนน
                  </p>
                </div>
              </div>

              {/* Question text */}
              <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.7, marginBottom: 18 }}>
                {currentQ.question_text}
              </p>

              {/* MCQ Options */}
              {currentQ.type === "mcq" && currentQ.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(currentQ.options as QuizOption[]).map((opt, oi) => {
                    const selected = answers[currentQ.id] === String(oi)
                    return (
                      <button
                        key={oi}
                        onClick={() => selectAnswer(String(oi))}
                        style={{
                          padding: "11px 14px",
                          borderRadius: 6,
                          border: `2px solid ${selected ? "var(--blue)" : "var(--border)"}`,
                          background: selected ? "var(--blue-light)" : "var(--surface)",
                          color: selected ? "var(--blue)" : "var(--text)",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 0.15s",
                          fontWeight: selected ? 600 : 400,
                          fontSize: 14,
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                          background: selected ? "var(--blue)" : "var(--bg-2)",
                          color: selected ? "#fff" : "var(--text-3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700,
                          border: "1px solid var(--border)",
                        }}>
                          {opt.label}
                        </div>
                        {opt.text}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Fill answer */}
              {currentQ.type === "fill" && (
                <input
                  className="input"
                  style={{ fontSize: 15, borderRadius: 4 }}
                  placeholder="พิมพ์คำตอบ..."
                  value={fillInput}
                  onChange={e => {
                    setFillInput(e.target.value)
                    setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))
                  }}
                  autoFocus
                />
              )}

              {/* Essay */}
              {currentQ.type === "essay" && (
                <textarea
                  className="input"
                  rows={5}
                  placeholder="เขียนคำตอบของคุณที่นี่..."
                  value={answers[currentQ.id] ?? ""}
                  onChange={e => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                  style={{ resize: "vertical", fontSize: 14, borderRadius: 4 }}
                />
              )}

              {/* Navigation */}
              <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", justifyContent: "space-between" }}>
                <button
                  className="btn btn-sm"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 4 }}
                >
                  <ChevronLeft size={13} /> ก่อนหน้า
                </button>

                {currentIdx === totalQ - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    style={{ display: "flex", alignItems: "center", gap: 5, borderRadius: 4 }}
                  >
                    <CheckCircle2 size={14} /> ส่งคำตอบ
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleNext}
                    style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 4 }}
                  >
                    ถัดไป <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Question Navigator */}
          <div className="card" style={{ padding: "14px", borderRadius: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--text-2)" }}>
              เลือกข้อ
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
              marginBottom: 12,
            }}>
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = i === currentIdx
                return (
                  <button
                    key={q.id}
                    onClick={() => handleJump(i)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: 4,
                      border: `2px solid ${isCurrent ? "var(--blue)" : isAnswered ? "var(--green)" : "var(--border)"}`,
                      background: isCurrent ? "var(--blue)" : isAnswered ? "var(--green-light)" : "var(--surface)",
                      color: isCurrent ? "#fff" : isAnswered ? "var(--green)" : "var(--text-3)",
                      fontWeight: isCurrent || isAnswered ? 700 : 400,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--text-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--blue)" }} />
                ข้อปัจจุบัน
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--green-light)", border: "1.5px solid var(--green)" }} />
                ตอบแล้ว
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px solid var(--border)" }} />
                ยังไม่ตอบ
              </div>
            </div>

            {/* Submit shortcut */}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>
                ตอบแล้ว {answeredCount}/{totalQ}
              </p>
              <button
                className="btn btn-sm btn-primary"
                style={{ width: "100%", justifyContent: "center", borderRadius: 4 }}
                onClick={handleSubmit}
              >
                <CheckCircle2 size={11} /> ส่งคำตอบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}