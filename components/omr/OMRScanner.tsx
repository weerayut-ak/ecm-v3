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
  barcodeOnlyMode?: boolean
  onBarcodeFound?: (serial: string) => void
}

type ScanStep = 'camera' | 'preview' | 'processing' | 'result'

interface DetectedAnswer {
  questionId: string
  questionNum: number
  selectedOption: number
  confidence: number
}

/* ── CSS ──────────────────────────────────────────────────────── */
const SCANNER_CSS = `
  /* ป้องกัน scroll ทั้งหน้าเมื่อ scanner เปิดอยู่ */
  body.scanner-open { overflow: hidden; position: fixed; width: 100%; }

  /* ซ่อน nav bar ของแอปเมื่อ scanner เปิดอยู่ */
  body.scanner-open nav,
  body.scanner-open [class*="bottom-nav"],
  body.scanner-open [class*="tab-bar"],
  body.scanner-open [class*="tabBar"],
  body.scanner-open [class*="bottomNav"],
  body.scanner-open footer {
    display: none !important;
  }

  .scanner-wrap {
    position: fixed; inset: 0;
    background: #0f172a;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    /* ใช้ dvh แทน vh เพื่อรองรับ mobile browser bar */
    height: 100dvh;
    height: -webkit-fill-available;
    overflow: hidden;
    /* รองรับ safe-area (notch/home indicator) */
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  .scanner-header {
    background: rgba(0,0,0,0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 10px 14px;
    padding-top: max(10px, env(safe-area-inset-top));
    display: flex; align-items: center;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
    min-height: 54px;
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
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,0.12); border: none;
    color: white; cursor: pointer; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    /* ขนาด tap target ที่ดีสำหรับมือถือ */
    touch-action: manipulation;
  }

  .scanner-steps {
    background: rgba(0,0,0,0.6);
    padding: 6px 14px;
    display: flex; gap: 4px;
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .scanner-steps::-webkit-scrollbar { display: none; }

  .scanner-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    /* ป้องกัน iOS overscroll */
    overscroll-behavior: none;
  }

  /* VIDEO ─ สำคัญมากสำหรับ iOS */
  .scanner-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    /* บังคับให้ iOS ไม่แสดง fullscreen controls */
    -webkit-playsinline: true;
  }

  /* Overlay กรอบ */
  .scanner-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .scanner-frame {
    position: relative;
    border: 2px solid rgba(255,255,255,0.6);
    border-radius: 12px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
  }

  /* กรอบมุม */
  .cam-corner {
    position: absolute; width: 20px; height: 20px;
    border-color: #60a5fa; border-style: solid; border-width: 0;
  }
  .cam-corner.tl { top:-2px; left:-2px; border-top-width:3px; border-left-width:3px; border-radius:5px 0 0 0; }
  .cam-corner.tr { top:-2px; right:-2px; border-top-width:3px; border-right-width:3px; border-radius:0 5px 0 0; }
  .cam-corner.bl { bottom:-2px; left:-2px; border-bottom-width:3px; border-left-width:3px; border-radius:0 0 0 5px; }
  .cam-corner.br { bottom:-2px; right:-2px; border-bottom-width:3px; border-right-width:3px; border-radius:0 0 5px 0; }

  /* แถบ scan animation */
  .scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #60a5fa, transparent);
    animation: scan-move 2s ease-in-out infinite;
  }
  @keyframes scan-move {
    0%   { top: 10%; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { top: 90%; opacity: 0; }
  }

  /* ปุ่มถ่ายรูป */
  .capture-btn {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    border: 4px solid rgba(255,255,255,0.4);
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: transform 0.1s;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .capture-btn:active { transform: scale(0.9); }
  .capture-btn-inner {
    width: 54px; height: 54px;
    border-radius: 50%;
    background: #1e40af;
  }

  /* ปุ่มทั่วไป */
  .sbtn {
    padding: 12px 22px; border-radius: 999px; border: none;
    font-weight: 800; font-size: 14px; cursor: pointer;
    display: flex; align-items: center; gap: 7px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .sbtn:active { transform: scale(0.96); opacity: 0.85; }
  .sbtn.ghost {
    background: rgba(255,255,255,0.14); color: white;
    border: 1px solid rgba(255,255,255,0.2);
  }
  .sbtn.primary {
    background: #0050cb; color: white;
    box-shadow: 0 4px 16px rgba(0,80,203,0.45);
  }
  .sbtn.primary:disabled {
    background: rgba(255,255,255,0.2);
    box-shadow: none; cursor: not-allowed;
  }

  /* Error card */
  .cam-error-card {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 28px 24px;
    max-width: 320px;
    text-align: center;
  }

  /* ManualReview */
  .review-serial-bar {
    padding: 10px 14px;
    display: flex; align-items: center;
    gap: 10px; flex-wrap: wrap; flex-shrink: 0;
  }
  .review-footer {
    padding: 12px 14px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    border-top: 1px solid var(--border, #e5e7eb);
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; flex-shrink: 0; flex-wrap: wrap;
  }
  .manual-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px; padding: 12px 14px;
  }
  .scanner-scroll {
    flex: 1; overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  @media (max-width: 390px) {
    .manual-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .sbtn { font-size: 13px; padding: 10px 16px; }
    .scanner-title h3 { font-size: 13px; }
  }
  @media (max-width: 320px) {
    .manual-grid { grid-template-columns: 1fr; }
  }

  /* Spinner */
  @keyframes omr-spin { to { transform: rotate(360deg); } }
  .omr-spinner {
    width: 48px; height: 48px; border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.2);
    border-top-color: white;
    animation: omr-spin 0.8s linear infinite;
  }
`

/* ── OpenCV loader ────────────────────────────────────────────── */
let cvReady = false
let cvLoading = false

function loadOpenCV(): Promise<void> {
  return new Promise(resolve => {
    if (cvReady) { resolve(); return }
    if (cvLoading) {
      const t = setInterval(() => { if (cvReady) { clearInterval(t); resolve() } }, 150)
      return
    }
    cvLoading = true
    const s = document.createElement('script')
    s.src = 'https://docs.opencv.org/4.x/opencv.js'
    s.async = true
    s.onload = () => {
      // @ts-ignore
      const tryInit = () => {
        // @ts-ignore
        const cv = window.cv
        if (!cv) { setTimeout(tryInit, 200); return }
        if (cv.Mat) { cvReady = true; resolve(); return } // already ready
        cv.onRuntimeInitialized = () => { cvReady = true; resolve() }
        // timeout fallback
        setTimeout(() => { if (!cvReady) { cvReady = true; resolve() } }, 10000)
      }
      tryInit()
    }
    s.onerror = () => { cvLoading = false; resolve() } // fail gracefully
    document.head.appendChild(s)
  })
}

/* ── QR Code detection ─────────────────────────────────────────── */
async function detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  // ลอง BarcodeDetector / jsQR — QR Code หลัก (Chrome Android, iOS 17+, Edge)
  if ('BarcodeDetector' in window) {
    try {
      // @ts-ignore
      const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats?.() ?? []
      const wanted = ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
      const formats = supported.length > 0
        ? wanted.filter(f => supported.includes(f))
        : wanted
      // @ts-ignore
      const det = new (window as any).BarcodeDetector({ formats: formats.length ? formats : ['qr_code', 'code_128'] })
      const codes = await det.detect(canvas)
      if (codes.length > 0) return codes[0].rawValue as string
    } catch { /* fallthrough */ }
  }

  // Fallback: jsQR สำหรับ Firefox / iOS Safari เก่า
  try {
    const jsQR = (window as any).jsQR
    if (jsQR) {
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, canvas.width, canvas.height)
      if (code?.data) return code.data as string
    }
  } catch { /* ignore */ }

  return null
}

/* ── Bubble detection (OpenCV.js) ─────────────────────────────── */
async function detectBubbles(canvas: HTMLCanvasElement, questions: Question[]): Promise<DetectedAnswer[]> {
  await loadOpenCV()
  // @ts-ignore
  const cv = window.cv
  if (!cv?.imread) throw new Error('OpenCV ไม่พร้อม')

  const mcqs = questions.filter(q => q.type === 'mcq')
  const src  = cv.imread(canvas)
  const gray = new cv.Mat(); const thresh = new cv.Mat()
  const contours = new cv.MatVector(); const hierarchy = new cv.Mat()

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.adaptiveThreshold(gray, thresh, 255,
      cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 15, 8)
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const circles: { x: number; y: number; fill: number }[] = []
    for (let i = 0; i < contours.size(); i++) {
      const cnt  = contours.get(i)
      const area = cv.contourArea(cnt)
      const peri = cv.arcLength(cnt, true)
      if (peri > 0) {
        const circ = (4 * Math.PI * area) / (peri * peri)
        if (circ > 0.65 && area > 60 && area < 800) {
          const m = cv.moments(cnt)
          if (m.m00 > 0) {
            const mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8UC1)
            const vec  = new cv.MatVector(); vec.push_back(cnt)
            cv.fillPoly(mask, vec, new cv.Scalar(255))
            const mean = cv.mean(thresh, mask)
            vec.delete(); mask.delete()
            circles.push({ x: m.m10 / m.m00, y: m.m01 / m.m00, fill: mean[0] })
          }
        }
      }
      cnt.delete()
    }

    circles.sort((a, b) => Math.floor(a.y / 20) - Math.floor(b.y / 20) || a.x - b.x)
    const rows: typeof circles[] = []
    let lastY = -999
    circles.forEach(c => {
      if (Math.abs(c.y - lastY) > 15) { rows.push([]); lastY = c.y }
      rows[rows.length - 1].push(c)
    })

    return mcqs.map((q, qi) => {
      const row = rows[qi]
      if (!row?.length) return { questionId: q.id, questionNum: qi + 1, selectedOption: -1, confidence: 0 }
      const maxFill = Math.max(...row.map(c => c.fill))
      const confidence = maxFill / 255
      return {
        questionId: q.id, questionNum: qi + 1,
        selectedOption: confidence > 0.31 ? row.findIndex(c => c.fill === maxFill) : -1,
        confidence,
      }
    })
  } finally {
    src.delete(); gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete()
  }
}

/* ── ManualReview ─────────────────────────────────────────────── */
function ManualReview({ questions, detected, detectedSerial, onConfirm, onBack }: {
  questions: Question[]
  detected: DetectedAnswer[]
  detectedSerial: string | null
  onConfirm: (answers: Record<string, number>, serial: string) => void
  onBack: () => void
}) {
  const mcqs   = questions.filter(q => q.type === 'mcq')
  const LABELS = ['A', 'B', 'C', 'D', 'E']
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    detected.forEach(d => { if (d.selectedOption >= 0) init[d.questionId] = d.selectedOption })
    return init
  })
  const [serial, setSerial]   = useState(detectedSerial ?? '')
  const uncertain = (detected ?? []).filter(d => d.confidence < 0.5 || d.selectedOption < 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface,#fff)' }}>

      {/* Serial bar */}
      <div className="review-serial-bar" style={{
        background: detectedSerial ? 'rgba(5,150,105,0.07)' : 'rgba(245,158,11,0.07)',
        borderBottom: `1px solid ${detectedSerial ? 'rgba(5,150,105,0.18)' : 'rgba(245,158,11,0.22)'}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: detectedSerial ? '#059669' : '#d97706', whiteSpace: 'nowrap' }}>
          {detectedSerial ? '🔢 รหัสกระดาษ (QR):' : '⚠️ ไม่พบ QR Code:'}
        </span>
        <input
          value={serial}
          onChange={e => setSerial(e.target.value.toUpperCase().trim())}
          placeholder="กรอกรหัส เช่น R250001"
          inputMode="text"
          autoComplete="off"
          style={{
            flex: 1, minWidth: 110, padding: '7px 10px', borderRadius: 8,
            border: `1.5px solid ${detectedSerial ? 'rgba(5,150,105,0.4)' : '#fbbf24'}`,
            fontSize: 14, fontWeight: 800, fontFamily: 'monospace',
            background: 'white', color: '#111', letterSpacing: '0.06em',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      {uncertain.length > 0 && (
        <div style={{ background: '#fef3c7', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#92400e', flexShrink: 0 }}>
          ⚠️ พบ {uncertain.length} ข้อที่ไม่แน่ใจ — กรุณาตรวจสอบ
        </div>
      )}

      {/* Answer grid */}
      <div className="scanner-scroll">
        <div className="manual-grid">
          {mcqs.map((q, qi) => {
            const det      = detected[qi]
            const opts     = q.options ?? []
            const isUncert = !det || det.confidence < 0.5 || det.selectedOption < 0
            return (
              <div key={q.id} style={{
                padding: '10px', borderRadius: 12,
                border: `1.5px solid ${isUncert ? '#fbbf24' : 'var(--border,#e5e7eb)'}`,
                background: isUncert ? '#fffbeb' : 'var(--surface-lowest,#f9fafb)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                    background: isUncert ? '#fbbf24' : 'rgba(0,80,203,0.1)',
                    color: isUncert ? 'white' : '#0050cb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{qi + 1}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3,#9ca3af)', fontWeight: 600 }}>
                    {isUncert ? '⚠️ ตรวจ' : `✓ ${Math.round((det?.confidence ?? 0) * 100)}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {opts.map((_, oi) => {
                    const sel = answers[q.id] === oi
                    return (
                      <button key={oi}
                        onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', fontSize: 13, fontWeight: 800,
                          border: `2px solid ${sel ? '#0050cb' : 'var(--border,#e5e7eb)'}`,
                          background: sel ? '#0050cb' : 'var(--surface,#fff)',
                          color: sel ? 'white' : 'var(--text-2,#6b7280)',
                          cursor: 'pointer', touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}>{LABELS[oi]}</button>
                    )
                  })}
                  <button
                    onClick={() => setAnswers(p => { const n = { ...p }; delete n[q.id]; return n })}
                    style={{
                      padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: '1.5px solid var(--border,#e5e7eb)', background: 'var(--surface,#fff)',
                      color: 'var(--text-3,#9ca3af)', cursor: 'pointer',
                      touchAction: 'manipulation',
                    }}>ว่าง</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="review-footer">
        <button onClick={onBack} style={{
          padding: '10px 18px', borderRadius: 999,
          border: '1.5px solid var(--border,#e5e7eb)',
          background: 'var(--surface,#fff)', color: 'var(--text-2,#6b7280)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation',
        }}>← ถ่ายใหม่</button>
        <span style={{ fontSize: 12, color: 'var(--text-3,#9ca3af)', textAlign: 'center', flex: 1, minWidth: 60 }}>
          {Object.keys(answers).length}/{mcqs.length} ข้อ
          {serial && <><br /><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0050cb', fontSize: 11 }}>#{serial}</span></>}
        </span>
        <button onClick={() => onConfirm(answers, serial)} style={{
          padding: '10px 18px', borderRadius: 999, border: 'none',
          background: '#0050cb', color: 'white',
          fontWeight: 800, fontSize: 13, cursor: 'pointer', touchAction: 'manipulation',
        }}>✓ บันทึก</button>
      </div>
    </div>
  )
}

/* ── useCamera hook ────────────────────────────────────────────── */
function useCamera(active: boolean, facingMode: 'environment' | 'user') {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready,    setReady]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [permDenied, setPermDenied] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setReady(false); setError(null); setPermDenied(false)

    async function startCamera() {
      // หยุด stream เดิมก่อน
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      // ตรวจสอบ API
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('browser ไม่รองรับกล้อง — ลองใช้ Chrome หรือ Safari')
        return
      }

      // ลอง constraint ลำดับจากดีที่สุดไปหา fallback
      const constraints: MediaStreamConstraints[] = [
        // 1. กล้องหลัง HD
        { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        // 2. กล้องหลังไม่บังคับ resolution
        { video: { facingMode } },
        // 3. กล้องใดก็ได้
        { video: true },
      ]

      let stream: MediaStream | null = null
      let lastErr: Error | null = null

      for (const c of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c)
          break
        } catch (e: any) {
          lastErr = e
          if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
            setPermDenied(true)
            setError('ถูกปฏิเสธการใช้กล้อง — ไปที่ตั้งค่า browser แล้วอนุญาต')
            return
          }
        }
      }

      if (!stream || cancelled) {
        stream?.getTracks().forEach(t => t.stop())
        if (!cancelled) setError(`เปิดกล้องไม่ได้: ${lastErr?.message ?? 'unknown'}`)
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video || cancelled) { stream.getTracks().forEach(t => t.stop()); return }

      // ── สำคัญมากสำหรับ iOS ──
      video.srcObject  = stream
      video.muted      = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')

      try {
        await video.play()
        if (!cancelled) setReady(true)
      } catch (playErr: any) {
        // autoplay policy: ลองอีกครั้งหลัง user gesture
        if (!cancelled) {
          setError('กดปุ่มด้านล่างเพื่อเปิดกล้อง (autoplay ถูกบล็อก)')
        }
      }
    }

    startCamera()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setReady(false)
    }
  }, [active, facingMode])

  const retryPlay = useCallback(async () => {
    const video = videoRef.current
    if (!video || !streamRef.current) return
    try { await video.play(); setReady(true); setError(null) } catch { }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  return { videoRef, streamRef, ready, error, permDenied, retryPlay, stop }
}

/* ── Main Scanner ─────────────────────────────────────────────── */
export default function OMRScanner({
  quiz, questions, onResult, onClose,
  barcodeOnlyMode = false, onBarcodeFound,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [step, setStep]              = useState<ScanStep>('camera')
  const [capturedImg, setCaptured]   = useState<string | null>(null)
  const [detected, setDetected]      = useState<DetectedAnswer[]>([])
  const [detectedSerial, setDSerial] = useState<string | null>(null)
  const [cvLoaded, setCvLoaded]      = useState(false)
  const [facingMode, setFacing]      = useState<'environment' | 'user'>('environment')

  const cam = useCamera(step === 'camera', facingMode)
  const mcqs = questions.filter(q => q.type === 'mcq')

  // lock body scroll เมื่อ scanner เปิด
  useEffect(() => {
    document.body.classList.add('scanner-open')
    return () => document.body.classList.remove('scanner-open')
  }, [])

  // โหลด OpenCV ล่วงหน้า + โหลด jsQR สำหรับ fallback QR scanning
  useEffect(() => {
    if (!barcodeOnlyMode) loadOpenCV().then(() => setCvLoaded(true))
    // โหลด jsQR สำหรับ browser ที่ไม่รองรับ BarcodeDetector
    if (typeof window !== 'undefined' && !(window as any).jsQR) {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
      s.async = true
      document.head.appendChild(s)
    }
  }, [barcodeOnlyMode])

  /* ── Capture ── */
  const capture = useCallback(() => {
    const video  = cam.videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const w = video.videoWidth  || 1280
    const h = video.videoHeight || 720
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCaptured(dataUrl)
    cam.stop()
    setStep('preview')
  }, [cam])

  /* ── Back to camera ── */
  const goBackToCamera = useCallback(() => {
    setCaptured(null); setDetected([]); setDSerial(null)
    setStep('camera')
  }, [])

  /* ── Process image ── */
  const processImage = useCallback(async () => {
    if (!capturedImg || !canvasRef.current) return
    setStep('processing')

    try {
      const img = new Image()
      img.src = capturedImg
      await new Promise<void>(r => { img.onload = () => r() })

      const canvas = canvasRef.current!
      canvas.width  = img.naturalWidth  || img.width
      canvas.height = img.naturalHeight || img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)

      if (barcodeOnlyMode) {
        const val = await detectBarcode(canvas)
        if (val) {
          toast.success(`พบรหัส: ${val}`)
          onBarcodeFound?.(val)
          goBackToCamera()
        } else {
          toast.error('ไม่พบ QR Code — ลองถ่ายใหม่ให้ชัดขึ้น')
          setStep('preview')
        }
        return
      }

      const [bubbles, barcode] = await Promise.all([
        detectBubbles(canvas, questions),
        detectBarcode(canvas),
      ])

      setDetected(bubbles)
      setDSerial(barcode)
      if (barcode) toast.success(`พบรหัสกระดาษ: ${barcode}`)
      else toast('ไม่พบ QR Code — กรอกรหัสเองได้', { icon: 'ℹ️' })
      setStep('result')
    } catch (err: any) {
      console.error(err)
      toast.error('ตรวจไม่สำเร็จ: ' + (err?.message ?? 'ลองถ่ายใหม่'))
      setStep('preview')
    }
  }, [capturedImg, questions, barcodeOnlyMode, onBarcodeFound, goBackToCamera])

  /* ── Steps ── */
  const STEPS: ScanStep[]  = ['camera', 'preview', 'processing', 'result']
  const STEP_TH            = ['ถ่ายรูป', 'ตรวจสอบ', 'ประมวลผล', 'ผลลัพธ์']
  const currentIdx         = STEPS.indexOf(step)

  return (
    <div className="scanner-wrap">
      <style>{SCANNER_CSS}</style>

      {/* ── Header ── */}
      <div className="scanner-header">
        <button className="scanner-icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="scanner-title">
          <h3>{barcodeOnlyMode ? '🔍 สแกน QR Code' : '📷 สแกนกระดาษคำตอบ'}</h3>
          <p>{barcodeOnlyMode ? 'สแกน QR Code บนกระดาษ' : quiz.title + ' · ' + mcqs.length + ' ข้อ'}</p>
        </div>

        {!barcodeOnlyMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: cvLoaded ? '#22c55e' : '#f59e0b',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, whiteSpace: 'nowrap' }}>
              {cvLoaded ? 'OpenCV ✓' : 'โหลด...'}
            </span>
          </div>
        )}

        {step === 'camera' && (
          <button
            onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')}
            className="scanner-icon-btn"
            aria-label="สลับกล้อง"
            style={{ fontSize: 16 }}
          >🔄</button>
        )}
      </div>

      {/* ── Step indicator ── */}
      <div className="scanner-steps">
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step === s ? '#0050cb' : i < currentIdx ? '#22c55e' : 'rgba(255,255,255,0.15)',
              color: 'white',
            }}>{i < currentIdx ? '✓' : i + 1}</div>
            <span style={{ fontSize: 10, color: step === s ? 'white' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
              {STEP_TH[i]}
            </span>
            {i < 3 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>›</span>}
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="scanner-body">

        {/* CAMERA */}
        {step === 'camera' && (
          <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden' }}>

            {/* Video element — ต้องอยู่ใน DOM ตลอดเวลาเพื่อให้ iOS ทำงาน */}
            <video
              ref={cam.videoRef}
              className="scanner-video"
              autoPlay
              playsInline
              muted
              // @ts-ignore — webkit-playsinline สำหรับ iOS เก่า
              webkit-playsinline="true"
            />

            {/* กรอบ overlay */}
            {cam.ready && (
              <div className="scanner-overlay">
                <div
                  className="scanner-frame"
                  style={{
                    width: '88%',
                    aspectRatio: barcodeOnlyMode ? '1/1' : '1.41/1',
                  }}
                >
                  <div className="cam-corner tl" /><div className="cam-corner tr" />
                  <div className="cam-corner bl" /><div className="cam-corner br" />
                  <div className="scan-line" />
                  {barcodeOnlyMode && (
                    <div style={{
                      position: 'absolute', inset: '30% 0', pointerEvents: 'none',
                      background: 'rgba(96,165,250,0.1)',
                      borderTop: '2px solid rgba(96,165,250,0.7)',
                      borderBottom: '2px solid rgba(96,165,250,0.7)',
                    }} />
                  )}
                </div>
              </div>
            )}

            {/* Loading / Error state */}
            {!cam.ready && !cam.error && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
                color: 'white',
              }}>
                <div className="omr-spinner" />
                <p style={{ fontSize: 14, fontWeight: 600 }}>กำลังเปิดกล้อง...</p>
              </div>
            )}

            {cam.error && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
              }}>
                <div className="cam-error-card">
                  <div style={{ fontSize: 44, marginBottom: 14 }}>📷</div>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.4 }}>
                    {cam.permDenied ? 'ถูกปฏิเสธการใช้กล้อง' : 'เปิดกล้องไม่ได้'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                    {cam.error}
                  </p>
                  {cam.permDenied ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.6 }}>
                      วิธีแก้:<br />
                      iOS: ตั้งค่า → Safari → กล้อง → อนุญาต<br />
                      Android: ตั้งค่า → แอป → Chrome → กล้อง → อนุญาต
                    </p>
                  ) : (
                    <button
                      onClick={cam.retryPlay}
                      style={{
                        padding: '11px 28px', borderRadius: 999,
                        background: '#0050cb', color: 'white',
                        border: 'none', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', touchAction: 'manipulation',
                      }}
                    >
                      ลองอีกครั้ง
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ปุ่มถ่ายรูป + hint */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px 20px 24px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                {barcodeOnlyMode
                  ? 'จัด QR Code ให้อยู่ในกรอบ · กดปุ่มเพื่อถ่ายภาพ'
                  : 'จัดกระดาษให้อยู่ในกรอบ · ถ่ายให้ตรงและชัดเจน'}
              </p>
              <button
                className="capture-btn"
                onClick={cam.ready ? capture : cam.retryPlay}
                aria-label={cam.ready ? 'ถ่ายรูป' : 'เปิดกล้อง'}
              >
                <div className="capture-btn-inner" style={{ background: cam.ready ? '#1e40af' : '#6b7280' }} />
              </button>
              {!cam.ready && !cam.error && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>รอกล้องพร้อม...</p>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && capturedImg && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 16, gap: 16, overflowY: 'auto',
            background: '#1e293b',
          }}>
            <img
              src={capturedImg}
              alt="ภาพที่ถ่าย"
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100dvh - 220px)',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="sbtn ghost" onClick={goBackToCamera}>↩ ถ่ายใหม่</button>
              <button
                className="sbtn primary"
                onClick={processImage}
                disabled={!barcodeOnlyMode && !cvLoaded}
              >
                {barcodeOnlyMode ? '🔍 สแกน QR Code' : cvLoaded ? '🔍 ตรวจคำตอบ' : '⏳ รอ OpenCV...'}
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 18, padding: 32, color: 'white',
          }}>
            <div className="omr-spinner" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {barcodeOnlyMode ? 'กำลังอ่าน QR Code...' : 'กำลังตรวจคำตอบ...'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {barcodeOnlyMode ? 'BarcodeDetector / jsQR' : 'OpenCV.js กำลังวิเคราะห์ภาพ'}
              </p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && !barcodeOnlyMode && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '8px 14px', flexShrink: 0,
              background: 'var(--surface-lowest,#f9fafb)',
              borderBottom: '1px solid var(--border,#e5e7eb)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <button onClick={goBackToCamera} style={{
                padding: '6px 14px', borderRadius: 999,
                border: '1.5px solid var(--border,#e5e7eb)',
                background: 'var(--surface,#fff)', color: 'var(--text-2,#6b7280)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                touchAction: 'manipulation',
              }}>← ถ่ายใหม่</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                ✓ ตรวจเสร็จ — ตรวจสอบก่อนบันทึก
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
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

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}