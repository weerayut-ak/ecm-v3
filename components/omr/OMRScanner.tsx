'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import type { Quiz, Question } from '@/types/quiz'
import toast from 'react-hot-toast'

interface Props {
  quiz: Quiz
  questions: Question[]
  onResult: (answers: Record<string, number>, studentId?: string) => void
  onClose: () => void
}

type ScanStep = 'camera' | 'preview' | 'processing' | 'result'

interface DetectedAnswer {
  questionId: string
  questionNum: number
  selectedOption: number   // 0=A, 1=B, 2=C, 3=D, 4=E, -1=ไม่ได้ฝน
  confidence: number       // 0-1
}

/* ── OpenCV.js loader ────────────────────────────────────────────── */
let cvReady = false
let cvLoading = false

function loadOpenCV(): Promise<void> {
  return new Promise((resolve) => {
    if (cvReady) { resolve(); return }
    if (cvLoading) {
      const check = setInterval(() => { if (cvReady) { clearInterval(check); resolve() } }, 100)
      return
    }
    cvLoading = true
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.x/opencv.js'
    script.async = true
    script.onload = () => {
      // @ts-ignore
      window.cv.onRuntimeInitialized = () => { cvReady = true; resolve() }
    }
    document.head.appendChild(script)
  })
}

/* ── Bubble detection using OpenCV.js ───────────────────────────── */
async function detectBubbles(
  canvas: HTMLCanvasElement,
  questions: Question[]
): Promise<DetectedAnswer[]> {
  await loadOpenCV()
  // @ts-ignore
  const cv = window.cv

  const mcqs = questions.filter(q => q.type === 'mcq')
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  const thresh = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    // 1. แปลงเป็น grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // 2. Gaussian blur ลด noise
    const ksize = new cv.Size(5, 5)
    cv.GaussianBlur(gray, gray, ksize, 0)

    // 3. Adaptive threshold — ทำงานได้แม้แสงไม่สม่ำเสมอ
    cv.adaptiveThreshold(
      gray, thresh, 255,
      cv.ADAPTIVE_THRESH_MEAN_C,
      cv.THRESH_BINARY_INV,
      15, 8
    )

    // 4. หา contours (วงกลม bubble)
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    // 5. กรอง contours ที่เป็นวงกลม (circularity > 0.7)
    const circles: { x: number; y: number; r: number; fill: number }[] = []
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      const perimeter = cv.arcLength(cnt, true)
      if (perimeter === 0) continue
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter)
      if (circularity > 0.65 && area > 60 && area < 800) {
        const moments = cv.moments(cnt)
        const cx = moments.m10 / moments.m00
        const cy = moments.m01 / moments.m00
        const r = Math.sqrt(area / Math.PI)

        // วัดความเข้มของ pixel ภายในวงกลม (ฝน = สีดำ)
        const mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8UC1)
        const cntVec = new cv.MatVector()
        cntVec.push_back(cnt)
        cv.fillPoly(mask, cntVec, new cv.Scalar(255))
        const mean = cv.mean(thresh, mask)
        cntVec.delete(); mask.delete()

        circles.push({ x: cx, y: cy, r, fill: mean[0] })
      }
      cnt.delete()
    }

    // 6. จับคู่ circles กับ question grid
    // เรียงตาม y (แถว) แล้ว x (คอลัมน์)
    circles.sort((a, b) => Math.floor(a.y / 20) - Math.floor(b.y / 20) || a.x - b.x)

    const optPerQ = mcqs.map(q => (q.options?.length ?? 4))
    const totalBubbles = optPerQ.reduce((s, n) => s + n, 0)
    const FILL_THRESHOLD = 80  // ค่า pixel ที่ถือว่าฝน

    // group circles เป็น rows ตาม y position
    const rows: typeof circles[] = []
    let lastY = -999
    circles.forEach(c => {
      if (Math.abs(c.y - lastY) > 15) { rows.push([]); lastY = c.y }
      rows[rows.length - 1].push(c)
    })

    const results: DetectedAnswer[] = mcqs.map((q, qi) => {
      const row = rows[qi]
      if (!row || row.length === 0) return { questionId: q.id, questionNum: qi + 1, selectedOption: -1, confidence: 0 }

      // หา bubble ที่ฝนมากที่สุด
      const maxFill = Math.max(...row.map(c => c.fill))
      const filledIdx = row.findIndex(c => c.fill === maxFill)
      const confidence = maxFill / 255

      return {
        questionId: q.id,
        questionNum: qi + 1,
        selectedOption: confidence > (FILL_THRESHOLD / 255) ? filledIdx : -1,
        confidence,
      }
    })

    return results
  } finally {
    src.delete(); gray.delete(); thresh.delete()
    contours.delete(); hierarchy.delete()
  }
}

/* ── Manual override component ───────────────────────────────────── */
function ManualReview({
  questions, detected, onConfirm
}: {
  questions: Question[]
  detected: DetectedAnswer[]
  onConfirm: (answers: Record<string, number>) => void
}) {
  const mcqs = questions.filter(q => q.type === 'mcq')
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    detected.forEach(d => { if (d.selectedOption >= 0) init[d.questionId] = d.selectedOption })
    return init
  })
  const LABELS = ['A', 'B', 'C', 'D', 'E']
  const uncertain = detected.filter(d => d.confidence < 0.5 || d.selectedOption < 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {uncertain.length > 0 && (
        <div style={{ background: '#fef3c7', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#92400e', display: 'flex', gap: 8 }}>
          ⚠️ พบ {uncertain.length} ข้อที่ไม่แน่ใจ — กรุณาตรวจสอบ
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {mcqs.map((q, qi) => {
            const det = detected[qi]
            const opts = q.options ?? []
            const isUncertain = !det || det.confidence < 0.5 || det.selectedOption < 0
            return (
              <div key={q.id} style={{
                padding: '10px 12px', borderRadius: 'var(--r-xl)',
                border: `1.5px solid ${isUncertain ? '#fbbf24' : 'var(--border)'}`,
                background: isUncertain ? '#fffbeb' : 'var(--surface-lowest)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                    background: isUncertain ? '#fbbf24' : 'var(--blue-light)',
                    color: isUncertain ? 'white' : 'var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{qi + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                    {isUncertain ? '⚠️ ต้องตรวจ' : `✓ ${Math.round((det?.confidence ?? 0) * 100)}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {opts.map((_, oi) => {
                    const selected = answers[q.id] === oi
                    return (
                      <button key={oi} onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))} style={{
                        width: 32, height: 32, borderRadius: '50%', fontSize: 12, fontWeight: 800,
                        border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        background: selected ? 'var(--primary)' : 'var(--surface)',
                        color: selected ? 'white' : 'var(--text-2)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {LABELS[oi]}
                      </button>
                    )
                  })}
                  <button onClick={() => setAnswers(p => { const n = { ...p }; delete n[q.id]; return n })} style={{
                    padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text-3)', cursor: 'pointer',
                  }}>ว่าง</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          ตอบแล้ว {Object.keys(answers).length} / {mcqs.length} ข้อ
        </span>
        <button onClick={() => onConfirm(answers)} className="btn btn-primary" style={{ gap: 6 }}>
          ✓ ยืนยันและบันทึกคะแนน
        </button>
      </div>
    </div>
  )
}

/* ── Main Scanner Component ──────────────────────────────────────── */
export default function OMRScanner({ quiz, questions, onResult, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  const [step, setStep]           = useState<ScanStep>('camera')
  const [capturedImg, setCaptured] = useState<string | null>(null)
  const [detected, setDetected]   = useState<DetectedAnswer[]>([])
  const [cvLoaded, setCvLoaded]   = useState(false)
  const [facingMode, setFacing]   = useState<'environment' | 'user'>('environment')

  const mcqs = questions.filter(q => q.type === 'mcq')

  // preload OpenCV
  useEffect(() => {
    loadOpenCV().then(() => setCvLoaded(true))
  }, [])

  // start camera
  useEffect(() => {
    if (step !== 'camera') return
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        toast.error('ไม่สามารถเข้าถึงกล้องได้')
      }
    }
    start()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [step, facingMode])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStep('preview')
  }, [])

  const processImage = useCallback(async () => {
    if (!capturedImg || !canvasRef.current) return
    setStep('processing')
    try {
      const img = new Image()
      img.src = capturedImg
      await new Promise(r => { img.onload = r })
      const canvas = canvasRef.current
      canvas.width  = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      const results = await detectBubbles(canvas, questions)
      setDetected(results)
      setStep('result')
    } catch (err) {
      console.error(err)
      toast.error('ตรวจไม่สำเร็จ ลองถ่ายใหม่')
      setStep('preview')
    }
  }, [capturedImg, questions])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>✕</button>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>📷 สแกนกระดาษคำตอบ</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{quiz.title} · {mcqs.length} ข้อ</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cvLoaded ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{cvLoaded ? 'OpenCV พร้อม' : 'กำลังโหลด...'}</span>
        </div>
        {step === 'camera' && (
          <button onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            🔄 กล้อง
          </button>
        )}
      </div>

      {/* Steps indicator */}
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 16px', display: 'flex', gap: 6 }}>
        {(['camera', 'preview', 'processing', 'result'] as ScanStep[]).map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step === s ? 'var(--primary)' : ['camera','preview','processing','result'].indexOf(step) > i ? '#22c55e' : 'rgba(255,255,255,0.15)',
              color: 'white',
            }}>{i + 1}</div>
            <span style={{ fontSize: 10, color: step === s ? 'white' : 'rgba(255,255,255,0.4)' }}>
              {['ถ่ายรูป','ตรวจสอบ','ประมวลผล','ผลลัพธ์'][i]}
            </span>
            {i < 3 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>›</span>}
          </div>
        ))}
      </div>

      {/* Camera view */}
      {step === 'camera' && (
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Guide overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '88%', aspectRatio: '1.41/1', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', position: 'relative' }}>
              {/* corner marks */}
              {[['0 0','tl'],['100% 0','tr'],['0 100%','bl'],['100% 100%','br']].map(([pos]) => (
                <div key={pos} style={{ position: 'absolute', top: pos.includes('0 0') ? -2 : pos.includes('100% 0') ? -2 : 'auto', bottom: pos.includes('100%') ? -2 : 'auto', left: pos.startsWith('0') ? -2 : 'auto', right: pos.includes('100%') && !pos.endsWith('0') ? -2 : 'auto', width: 16, height: 16, borderTop: pos.includes('0 0') || pos.includes('100% 0') ? '3px solid #60a5fa' : 'none', borderBottom: !pos.includes('0 0') && !pos.includes('100% 0') ? '3px solid #60a5fa' : 'none', borderLeft: pos.startsWith('0') ? '3px solid #60a5fa' : 'none', borderRight: !pos.startsWith('0') ? '3px solid #60a5fa' : 'none' }} />
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 16 }}>จัดกระดาษให้อยู่ในกรอบ</p>
            <button onClick={capture} style={{
              width: 70, height: 70, borderRadius: '50%',
              background: 'white', border: '4px solid rgba(255,255,255,0.5)',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1e40af', margin: '5px auto' }} />
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && capturedImg && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 }}>
          <img src={capturedImg} alt="captured" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 220px)', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setCaptured(null); setStep('camera') }} style={{ padding: '10px 24px', borderRadius: 'var(--r-full)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              ↩ ถ่ายใหม่
            </button>
            <button onClick={processImage} disabled={!cvLoaded} style={{ padding: '10px 28px', borderRadius: 'var(--r-full)', background: cvLoaded ? 'var(--primary)' : 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: cvLoaded ? 'pointer' : 'not-allowed', fontWeight: 800, boxShadow: cvLoaded ? '0 4px 16px rgba(0,80,203,0.4)' : 'none' }}>
              🔍 ตรวจคำตอบ
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'white' }}>
          <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>กำลังตรวจคำตอบ...</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>OpenCV กำลังประมวลผลภาพ</p>
        </div>
      )}

      {/* Result / Manual review */}
      {step === 'result' && (
        <div style={{ flex: 1, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--surface-lowest)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
              ✓ ตรวจเสร็จแล้ว — ตรวจสอบและแก้ไขก่อนบันทึก
            </span>
          </div>
          <ManualReview
            questions={questions}
            detected={detected}
            onConfirm={onResult}
          />
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}