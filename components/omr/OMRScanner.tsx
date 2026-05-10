'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import type { Quiz, Question } from '@/types/quiz'
import toast from 'react-hot-toast'

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  quiz: Quiz
  questions: Question[]
  onResult: (answers: Record<string, number>, serial?: string) => void
  onClose: () => void
  /** true = โหมดสแกนบาร์โค้ดเพื่อดูประวัติเท่านั้น */
  barcodeOnlyMode?: boolean
  onBarcodeFound?: (serial: string) => void
}

type ScanStep = 'camera' | 'preview' | 'processing' | 'result'

interface DetectedAnswer {
  questionId: string
  questionNum: number
  selectedOption: number   // 0=A,1=B,2=C,3=D,4=E, -1=ไม่ได้ฝน
  confidence: number
}

/* ── CSS Mobile-friendly ──────────────────────────────────────── */
const SCANNER_CSS = `
  .scanner-wrap {
    position: fixed; inset: 0; background: #0f172a;
    z-index: 9999; display: flex; flex-direction: column;
    overflow: hidden;
  }
  .scanner-header {
    background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
    padding: 10px 14px; display: flex; align-items: center;
    gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0; min-height: 54px;
  }
  .scanner-title { flex: 1; min-width: 0; }
  .scanner-title h3 {
    color: white; font-weight: 800; font-size: 14px;
    margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .scanner-title p {
    color: rgba(255,255,255,0.5); font-size: 11px;
    margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .scanner-icon-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.12); border: none;
    color: white; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
  }
  .scanner-icon-btn:hover { background: rgba(255,255,255,0.22); }
  .scanner-steps {
    background: rgba(0,0,0,0.5); padding: 6px 14px;
    display: flex; gap: 4px; flex-shrink: 0;
    overflow-x: auto; scrollbar-width: none;
  }
  .scanner-steps::-webkit-scrollbar { display: none; }
  .scanner-body {
    flex: 1; overflow: hidden; display: flex; flex-direction: column;
    position: relative;
  }
  .scanner-body-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

  .cam-corner { position: absolute; width: 18px; height: 18px; border-color: #60a5fa; border-style: solid; border-width: 0; }
  .cam-corner.tl { top:-2px; left:-2px; border-top-width:3px; border-left-width:3px; border-radius:4px 0 0 0; }
  .cam-corner.tr { top:-2px; right:-2px; border-top-width:3px; border-right-width:3px; border-radius:0 4px 0 0; }
  .cam-corner.bl { bottom:-2px; left:-2px; border-bottom-width:3px; border-left-width:3px; border-radius:0 0 0 4px; }
  .cam-corner.br { bottom:-2px; right:-2px; border-bottom-width:3px; border-right-width:3px; border-radius:0 0 4px 0; }

  .capture-btn {
    width: 68px; height: 68px; border-radius: 50%; background: white;
    border: 4px solid rgba(255,255,255,0.45); cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.45); transition: transform 0.1s;
    display: flex; align-items: center; justify-content: center;
  }
  .capture-btn:active { transform: scale(0.93); }

  .scan-action-row {
    display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
    padding: 16px;
  }
  .sbtn {
    padding: 10px 22px; border-radius: 999px; border: none;
    font-weight: 800; font-size: 13px; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 6px;
  }
  .sbtn:active { transform: scale(0.96); }
  .sbtn.ghost { background: rgba(255,255,255,0.13); color: white; }
  .sbtn.ghost:hover { background: rgba(255,255,255,0.22); }
  .sbtn.primary { background: #0050cb; color: white; box-shadow: 0 4px 14px rgba(0,80,203,0.4); }
  .sbtn.primary:disabled { background: rgba(255,255,255,0.18); box-shadow: none; cursor: not-allowed; }

  .review-serial-bar {
    padding: 8px 14px; display: flex; align-items: center;
    gap: 10px; flex-wrap: wrap; flex-shrink: 0;
  }
  .review-footer {
    padding: 12px 14px; border-top: 1px solid var(--border, #e5e7eb);
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; flex-shrink: 0; flex-wrap: wrap;
  }
  .manual-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 10px; padding: 12px 14px;
  }
  @media (max-width: 420px) {
    .manual-grid { grid-template-columns: 1fr; }
    .scanner-title h3 { font-size: 12px; }
    .sbtn { font-size: 12px; padding: 9px 16px; }
  }
  @keyframes omr-spin { to { transform: rotate(360deg); } }
`

/* ── OpenCV loader ──────────────────────────────────────────────── */
let cvReady = false
let cvLoading = false
function loadOpenCV(): Promise<void> {
  return new Promise(resolve => {
    if (cvReady) { resolve(); return }
    if (cvLoading) {
      const t = setInterval(() => { if (cvReady) { clearInterval(t); resolve() } }, 100)
      return
    }
    cvLoading = true
    const s = document.createElement('script')
    s.src = 'https://docs.opencv.org/4.x/opencv.js'
    s.async = true
    s.onload = () => {
      // @ts-ignore
      if (window.cv && window.cv.onRuntimeInitialized !== undefined) {
        // @ts-ignore
        window.cv.onRuntimeInitialized = () => { cvReady = true; resolve() }
      } else {
        // @ts-ignore
        const check = setInterval(() => {
          // @ts-ignore
          if (window.cv?.Mat) { clearInterval(check); cvReady = true; resolve() }
        }, 200)
        setTimeout(() => { clearInterval(check); cvReady = true; resolve() }, 15000)
      }
    }
    s.onerror = () => { cvLoading = false; resolve() } // fail gracefully
    document.head.appendChild(s)
  })
}

/* ── Barcode detection ──────────────────────────────────────────── */
async function detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const supported = await (window as any).BarcodeDetector.getSupportedFormats?.() ?? []
      const formats = supported.length > 0
        ? (['code_128','code_39','qr_code','ean_13','upc_a'] as string[]).filter(f => supported.includes(f))
        : ['code_128','code_39','qr_code']
      // @ts-ignore
      const det = new (window as any).BarcodeDetector({ formats: formats.length ? formats : ['code_128','qr_code'] })
      const codes = await det.detect(canvas)
      if (codes.length > 0) return codes[0].rawValue as string
    }
  } catch { }
  return null
}

/* ── Bubble detection ───────────────────────────────────────────── */
async function detectBubbles(canvas: HTMLCanvasElement, questions: Question[]): Promise<DetectedAnswer[]> {
  await loadOpenCV()
  // @ts-ignore
  const cv = window.cv
  const mcqs = questions.filter(q => q.type === 'mcq')
  const src = cv.imread(canvas)
  const gray = new cv.Mat(); const thresh = new cv.Mat()
  const contours = new cv.MatVector(); const hierarchy = new cv.Mat()
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 15, 8)
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const circles: { x: number; y: number; fill: number }[] = []
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      const peri = cv.arcLength(cnt, true)
      if (peri > 0) {
        const circ = (4 * Math.PI * area) / (peri * peri)
        if (circ > 0.65 && area > 60 && area < 800) {
          const m = cv.moments(cnt)
          if (m.m00 > 0) {
            const mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8UC1)
            const cv2 = new cv.MatVector(); cv2.push_back(cnt)
            cv.fillPoly(mask, cv2, new cv.Scalar(255))
            const mean = cv.mean(thresh, mask)
            cv2.delete(); mask.delete()
            circles.push({ x: m.m10/m.m00, y: m.m01/m.m00, fill: mean[0] })
          }
        }
      }
      cnt.delete()
    }

    circles.sort((a,b) => Math.floor(a.y/20)-Math.floor(b.y/20) || a.x-b.x)
    const rows: typeof circles[] = []
    let lastY = -999
    circles.forEach(c => {
      if (Math.abs(c.y - lastY) > 15) { rows.push([]); lastY = c.y }
      rows[rows.length-1].push(c)
    })

    const FILL_THR = 80/255
    return mcqs.map((q, qi) => {
      const row = rows[qi]
      if (!row?.length) return { questionId: q.id, questionNum: qi+1, selectedOption: -1, confidence: 0 }
      const maxFill = Math.max(...row.map(c => c.fill))
      const confidence = maxFill/255
      return {
        questionId: q.id, questionNum: qi+1,
        selectedOption: confidence > FILL_THR ? row.findIndex(c => c.fill === maxFill) : -1,
        confidence,
      }
    })
  } finally {
    src.delete(); gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete()
  }
}

/* ── ManualReview ───────────────────────────────────────────────── */
function ManualReview({ questions, detected, detectedSerial, onConfirm, onBack }: {
  questions: Question[]
  detected: DetectedAnswer[]
  detectedSerial: string | null
  onConfirm: (answers: Record<string, number>, serial: string) => void
  onBack: () => void
}) {
  const mcqs = questions.filter(q => q.type === 'mcq')
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    detected.forEach(d => { if (d.selectedOption >= 0) init[d.questionId] = d.selectedOption })
    return init
  })
  const [serial, setSerial] = useState(detectedSerial ?? '')
  const LABELS = ['A','B','C','D','E']
  const uncertain = (detected ?? []).filter(d => d.confidence < 0.5 || d.selectedOption < 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface,#fff)' }}>
      {/* Serial bar */}
      <div className="review-serial-bar" style={{
        background: detectedSerial ? 'rgba(5,150,105,0.07)' : 'rgba(245,158,11,0.07)',
        borderBottom: `1px solid ${detectedSerial ? 'rgba(5,150,105,0.18)' : 'rgba(245,158,11,0.22)'}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: detectedSerial ? '#059669' : '#d97706', whiteSpace: 'nowrap' }}>
          {detectedSerial ? '🔢 รหัสกระดาษ:' : '⚠️ ไม่พบบาร์โค้ด — กรอกเอง:'}
        </span>
        <input
          value={serial}
          onChange={e => setSerial(e.target.value.toUpperCase().trim())}
          placeholder="เช่น EX250001"
          style={{
            flex: 1, minWidth: 110, padding: '5px 10px', borderRadius: 8,
            border: `1.5px solid ${detectedSerial ? 'rgba(5,150,105,0.4)' : '#fbbf24'}`,
            fontSize: 13, fontWeight: 800, fontFamily: 'monospace',
            background: 'white', color: '#111', letterSpacing: '0.06em',
          }}
        />
      </div>

      {uncertain.length > 0 && (
        <div style={{ background: '#fef3c7', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#92400e', flexShrink: 0 }}>
          ⚠️ พบ {uncertain.length} ข้อที่ไม่แน่ใจ — กรุณาตรวจสอบ
        </div>
      )}

      <div className="scanner-body-scroll" style={{ flex: 1 }}>
        <div className="manual-grid">
          {mcqs.map((q, qi) => {
            const det = detected[qi]
            const opts = q.options ?? []
            const uncertain = !det || det.confidence < 0.5 || det.selectedOption < 0
            return (
              <div key={q.id} style={{
                padding: '10px 12px', borderRadius: 14,
                border: `1.5px solid ${uncertain ? '#fbbf24' : 'var(--border,#e5e7eb)'}`,
                background: uncertain ? '#fffbeb' : 'var(--surface-lowest,#f9fafb)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                    background: uncertain ? '#fbbf24' : 'rgba(0,80,203,0.1)',
                    color: uncertain ? 'white' : '#0050cb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{qi+1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3,#9ca3af)', fontWeight: 600 }}>
                    {uncertain ? '⚠️ ต้องตรวจ' : `✓ ${Math.round((det?.confidence??0)*100)}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {opts.map((_, oi) => {
                    const sel = answers[q.id] === oi
                    return (
                      <button key={oi} onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))} style={{
                        width: 34, height: 34, borderRadius: '50%', fontSize: 12, fontWeight: 800,
                        border: `2px solid ${sel ? '#0050cb' : 'var(--border,#e5e7eb)'}`,
                        background: sel ? '#0050cb' : 'var(--surface,#fff)',
                        color: sel ? 'white' : 'var(--text-2,#6b7280)',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}>{LABELS[oi]}</button>
                    )
                  })}
                  <button onClick={() => setAnswers(p => { const n={...p}; delete n[q.id]; return n })} style={{
                    padding: '4px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    border: '1.5px solid var(--border,#e5e7eb)', background: 'var(--surface,#fff)',
                    color: 'var(--text-3,#9ca3af)', cursor: 'pointer',
                  }}>ว่าง</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="review-footer">
        <button onClick={onBack} style={{
          padding: '9px 18px', borderRadius: 999,
          border: '1.5px solid var(--border,#e5e7eb)',
          background: 'var(--surface,#fff)', color: 'var(--text-2,#6b7280)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>← ถ่ายใหม่</button>
        <span style={{ fontSize: 12, color: 'var(--text-3,#9ca3af)', textAlign: 'center', flex: 1 }}>
          {Object.keys(answers).length}/{mcqs.length} ข้อ
          {serial && <> · <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0050cb' }}>#{serial}</span></>}
        </span>
        <button onClick={() => onConfirm(answers, serial)} style={{
          padding: '9px 20px', borderRadius: 999, border: 'none',
          background: '#0050cb', color: 'white',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
        }}>✓ ยืนยันและบันทึก</button>
      </div>
    </div>
  )
}

/* ── Main Scanner ─────────────────────────────────────────────────── */
export default function OMRScanner({ quiz, questions, onResult, onClose, barcodeOnlyMode=false, onBarcodeFound }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep]            = useState<ScanStep>('camera')
  const [capturedImg, setCaptured] = useState<string | null>(null)
  const [detected, setDetected]    = useState<DetectedAnswer[]>([])
  const [detectedSerial, setDSerial] = useState<string | null>(null)
  const [cvLoaded, setCvLoaded]    = useState(false)
  const [facingMode, setFacing]    = useState<'environment'|'user'>('environment')
  const [camError, setCamError]    = useState<string | null>(null)

  const mcqs = questions.filter(q => q.type === 'mcq')

  useEffect(() => {
    if (!barcodeOnlyMode) loadOpenCV().then(() => setCvLoaded(true))
  }, [barcodeOnlyMode])

  useEffect(() => {
    if (step !== 'camera') return
    let active = true
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(()=>{}) }
        setCamError(null)
      } catch {
        setCamError('ไม่สามารถเข้าถึงกล้องได้ — กรุณาอนุญาตการใช้กล้อง')
      }
    }
    start()
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [step, facingMode])

  const capture = useCallback(() => {
    const v = videoRef.current; const c = canvasRef.current
    if (!v || !c) return
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720
    c.getContext('2d')!.drawImage(v, 0, 0)
    setCaptured(c.toDataURL('image/jpeg', 0.92))
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStep('preview')
  }, [])

  const goBackToCamera = useCallback(() => {
    setCaptured(null); setDetected([]); setDSerial(null); setStep('camera')
  }, [])

  const processImage = useCallback(async () => {
    if (!capturedImg || !canvasRef.current) return
    setStep('processing')
    try {
      const img = new Image(); img.src = capturedImg
      await new Promise<void>(r => { img.onload = () => r() })
      const canvas = canvasRef.current!
      canvas.width = img.width; canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)

      if (barcodeOnlyMode) {
        const val = await detectBarcode(canvas)
        if (val) {
          toast.success(`พบรหัส: ${val}`)
          onBarcodeFound?.(val)
          // รีเซ็ตสถานะเพื่อให้สแกนซ้ำได้
          goBackToCamera()
        } else {
          toast.error('ไม่พบบาร์โค้ด — ลองถ่ายใหม่ให้ชัดขึ้น')
          setStep('preview')
        }
        return
      }

      const [bubbles, barcode] = await Promise.all([detectBubbles(canvas, questions), detectBarcode(canvas)])
      setDetected(bubbles)
      setDSerial(barcode)
      if (barcode) toast.success(`พบรหัสกระดาษ: ${barcode}`)
      else toast('ไม่พบบาร์โค้ด — กรอกรหัสเองได้', { icon: 'ℹ️' })
      setStep('result')
    } catch (err) {
      console.error(err)
      toast.error('ตรวจไม่สำเร็จ ลองถ่ายใหม่')
      setStep('preview')
    }
  }, [capturedImg, questions, barcodeOnlyMode, onBarcodeFound])

  const STEPS: ScanStep[] = ['camera','preview','processing','result']
  const LABELS_STEP = ['ถ่ายรูป','ตรวจสอบ','ประมวลผล','ผลลัพธ์']

  return (
    <div className="scanner-wrap">
      <style>{SCANNER_CSS}</style>

      {/* Header */}
      <div className="scanner-header">
        <button className="scanner-icon-btn" onClick={onClose}>✕</button>
        <div className="scanner-title">
          <h3>{barcodeOnlyMode ? '🔍 สแกนบาร์โค้ดดูประวัติ' : '📷 สแกนกระดาษคำตอบ'}</h3>
          <p>{quiz.title}{!barcodeOnlyMode && ` · ${mcqs.length} ข้อ`}</p>
        </div>
        {!barcodeOnlyMode && (
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:cvLoaded?'#22c55e':'#f59e0b', display:'inline-block' }} />
            <span style={{ color:'rgba(255,255,255,0.5)', fontSize:10, whiteSpace:'nowrap' }}>
              {cvLoaded ? 'OpenCV พร้อม' : 'โหลด...'}
            </span>
          </div>
        )}
        {step === 'camera' && (
          <button onClick={() => setFacing(f => f==='environment'?'user':'environment')} style={{
            background:'rgba(255,255,255,0.15)', border:'none', color:'white',
            padding:'6px 11px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0,
          }}>🔄</button>
        )}
      </div>

      {/* Steps */}
      <div className="scanner-steps">
        {STEPS.map((s, i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <div style={{
              width:20, height:20, borderRadius:'50%', fontSize:10, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: step===s ? '#0050cb' : STEPS.indexOf(step)>i ? '#22c55e' : 'rgba(255,255,255,0.15)',
              color:'white',
            }}>{i+1}</div>
            <span style={{ fontSize:10, color:step===s?'white':'rgba(255,255,255,0.4)', whiteSpace:'nowrap' }}>{LABELS_STEP[i]}</span>
            {i<3 && <span style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>›</span>}
          </div>
        ))}
      </div>

      <div className="scanner-body">

        {/* CAMERA */}
        {step === 'camera' && (
          <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {camError ? (
              <div style={{ textAlign:'center', color:'white', padding:24 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
                <p style={{ fontSize:14, marginBottom:16, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>{camError}</p>
                <button onClick={() => { setCamError(null) }} style={{
                  padding:'10px 24px', borderRadius:999, background:'#0050cb',
                  color:'white', border:'none', fontWeight:700, cursor:'pointer',
                }}>ลองอีกครั้ง</button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <div style={{
                    width:'88%',
                    aspectRatio: barcodeOnlyMode ? '3.5/1' : '1.41/1',
                    border:'2px solid rgba(255,255,255,0.55)',
                    borderRadius:10,
                    boxShadow:'0 0 0 9999px rgba(0,0,0,0.38)',
                    position:'relative',
                  }}>
                    <div className="cam-corner tl" /><div className="cam-corner tr" />
                    <div className="cam-corner bl" /><div className="cam-corner br" />
                    {barcodeOnlyMode && (
                      <div style={{
                        position:'absolute', inset:'35% 0',
                        background:'rgba(96,165,250,0.12)',
                        borderTop:'1.5px solid rgba(96,165,250,0.55)',
                        borderBottom:'1.5px solid rgba(96,165,250,0.55)',
                      }} />
                    )}
                  </div>
                </div>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 20px', background:'linear-gradient(transparent,rgba(0,0,0,0.68))' }}>
                  <p style={{ color:'rgba(255,255,255,0.75)', fontSize:12, textAlign:'center', marginBottom:14 }}>
                    {barcodeOnlyMode ? 'จัดบาร์โค้ดให้อยู่ในแถบสีน้ำเงิน' : 'จัดกระดาษให้อยู่ในกรอบ · บาร์โค้ดจะสแกนอัตโนมัติ'}
                  </p>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <button className="capture-btn" onClick={capture}>
                      <div style={{ width:50, height:50, borderRadius:'50%', background:'#1e40af' }} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && capturedImg && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto', gap:16 }}>
            <img src={capturedImg} alt="ภาพที่ถ่าย" style={{
              maxWidth:'100%', maxHeight:'calc(100dvh - 240px)',
              objectFit:'contain', borderRadius:10, boxShadow:'0 8px 30px rgba(0,0,0,0.5)',
            }} />
            <div className="scan-action-row" style={{ padding:0 }}>
              <button className="sbtn ghost" onClick={goBackToCamera}>↩ ถ่ายใหม่</button>
              <button className="sbtn primary" onClick={processImage} disabled={!barcodeOnlyMode && !cvLoaded}>
                {barcodeOnlyMode ? '🔍 สแกนบาร์โค้ด' : cvLoaded ? '🔍 ตรวจคำตอบ' : '⏳ รอ OpenCV...'}
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'white', padding:24 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', border:'4px solid rgba(255,255,255,0.2)', borderTopColor:'white', animation:'omr-spin 0.8s linear infinite' }} />
            <p style={{ fontSize:15, fontWeight:600, textAlign:'center' }}>
              {barcodeOnlyMode ? 'กำลังอ่านบาร์โค้ด...' : 'กำลังตรวจคำตอบและอ่านรหัสกระดาษ...'}
            </p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', textAlign:'center' }}>
              {barcodeOnlyMode ? 'BarcodeDetector API' : 'OpenCV.js + BarcodeDetector กำลังประมวลผล'}
            </p>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && !barcodeOnlyMode && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{
              padding:'8px 14px', background:'var(--surface-lowest,#f9fafb)',
              borderBottom:'1px solid var(--border,#e5e7eb)',
              flexShrink:0, display:'flex', alignItems:'center', gap:8,
            }}>
              <button onClick={goBackToCamera} style={{
                padding:'5px 12px', borderRadius:999,
                border:'1.5px solid var(--border,#e5e7eb)',
                background:'var(--surface,#fff)', color:'var(--text-2,#6b7280)',
                fontWeight:700, fontSize:12, cursor:'pointer',
              }}>← ถ่ายใหม่</button>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-2,#374151)' }}>
                ✓ ตรวจเสร็จ — ตรวจสอบก่อนบันทึก
              </span>
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <ManualReview
                questions={questions}
                detected={detected}
                detectedSerial={detectedSerial}
                onConfirm={(answers, serial) => onResult(answers, serial)}
                onBack={goBackToCamera}
              />
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  )
}
