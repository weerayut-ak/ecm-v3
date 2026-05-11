"use client"

import { useState, useEffect, useRef, CSSProperties } from "react"
import { createClient } from '@/lib/supabase/client'
import { History, Save, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react'


// ─── Load external scripts via <script> tag (Webpack-safe) ───────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.async = true
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

async function loadPDFLibs() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
}

// ─── A4 @96 dpi ───────────────────────────────────────────────────────────────
const SHEET_W = 794
const SHEET_H = 1123

interface Quiz { id: string; title: string; pass_score: number; time_limit?: number }
interface Question {
  id: string; type: string; question_text: string
  correct_answer: string; quiz_id: string; order: number
  options?: { label: string }[]
}
interface TeacherMeta {
  subject: string; subjectCode: string; examDate: string
  examTime: string; examDuration: string; room: string; note: string
}

const LABELS = ['A','B','C','D','E']

// ─── Saved Sheet Batch (Supabase) ────────────────────────────────
interface SheetBatch {
  id: string
  exam_id: string | null
  exam_title: string
  school: string
  subject_code: string
  num_questions: number
  options_per_q: number
  copies: number
  serials: string[]
  prefix: string
  year_bce: number
  start_seq: number
  created_at: string
}

function genSerial(prefix: string, year: number, seq: number) {
  return `${prefix}${String(year).slice(-2)}${String(seq).padStart(4,'0')}`
}

// ─── QR Code — dynamic import 'qrcode' (npm) ────────────────────────────────
// ติดตั้งก่อน: npm install qrcode @types/qrcode
function QRCodeCanvas({ value, size }: { value: string; size: number }) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    if (!value) return
    let cancelled = false
    // dynamic import ทำงานได้ทั้ง server และ client ใน Next.js
    import('qrcode').then(QRCode => {
      if (cancelled) return
      return QRCode.toDataURL(value, {
        width: size * 2,      // 192px — ความละเอียดดี สแกนได้ง่าย
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
    }).then(url => {
      if (!cancelled && url) setDataUrl(url as string)
    }).catch(err => {
      console.warn('QR Code error:', err)
    })
    return () => { cancelled = true }
  }, [value, size])

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      background:'white', padding:'4px 4px 2px' }}>
      {dataUrl
        ? <img
            src={dataUrl}
            style={{ width:size, height:size, display:'block', imageRendering:'pixelated' }}
            alt={`QR:${value}`}
          />
        : <div style={{ width:size, height:size, background:'#f3f0ff', border:'1px solid #c4b5fd',
            borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, color:'#9ca3af' }}>QR…</div>
      }
      <span style={{ fontFamily:'monospace', fontSize:8, fontWeight:800, color:'#5a1a9e',
        letterSpacing:'0.04em', textAlign:'center',
        maxWidth:size, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Digit Column ─────────────────────────────────────────────────────────────
function DigitCol({ bsz }: { bsz: number }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:Math.round(bsz*0.1), alignItems:'center' }}>
      {/* ช่องสี่เหลี่ยมสำหรับให้ผู้เขียนเติมตัวเลข */}
      <div style={{
        width: bsz, height: bsz + 2,
        border: '1px solid #555', background: 'white', flexShrink: 0,
        marginBottom: 2, boxSizing: 'border-box'
      }} />

      {/* ช่องวงกลมฝนตัวเลข 0-9 */}
      {Array.from({length:10},(_,d)=>(
        <div key={d} style={{
          width:bsz, height:bsz, borderRadius:'50%',
          border:'1px solid #555', background:'white', flexShrink:0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', // จัดกึ่งกลางด้วย Flexbox
          boxSizing: 'border-box'
        }}>
          {/* ใช้ lineHeight:1 + textAlign:center แทน lineHeight:0 เพื่อให้ html2canvas render ตำแหน่งถูกต้อง */}
          <span style={{
            fontFamily:'"Arial", sans-serif', fontSize:bsz*0.5, fontWeight:700, color:'#333',
            lineHeight:1, display:'block', textAlign:'center'
          }}>{d}</span>
        </div>
      ))}
    </div>
  )
}

function DigitGrid({ cols, label, bsz=13.5 }: { cols:number; label:string; bsz?:number }) {
  return (
    <div style={{
      border:'1px solid #888', borderRadius:2, padding:'3px 4px', background:'white',
      display:'inline-flex', flexDirection:'column', alignItems:'center', flexShrink:0,
      boxSizing: 'border-box' // ป้องกันขอบล้น
    }}>
      <div style={{ fontSize:8.5, fontWeight:800, color:'#222', marginBottom:4,
        letterSpacing:'0.04em', textAlign:'center', whiteSpace:'nowrap' }}>{label}</div>
      <div style={{ display:'flex', gap:Math.round(bsz*0.12) }}>
        {Array.from({length:cols},(_,ci)=><DigitCol key={ci} bsz={bsz}/>)}
      </div>
    </div>
  )
}

// ─── Answer Group ─────────────────────────────────────────────────────────────
function AnswerGroup({ questions, startNum, optCount, bsz=19 }: {
  questions:Question[]; startNum:number; optCount:number; bsz?:number
}) {
  const numW = 26
  const gap  = Math.round(bsz*0.13)
  return (
    <div style={{ display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap, marginBottom:7 }}>
        <span style={{ width:numW, flexShrink:0 }}/>
        {Array.from({length:optCount},(_,i)=>(
          <span key={i} style={{ fontFamily:'"Arial", sans-serif', width:bsz, textAlign:'center', fontSize:11,
            fontWeight:900, color:'#5a1a9e', flexShrink:0, display:'inline-block' }}>{LABELS[i]}</span>
        ))}
      </div>
      {questions.map((q,idx)=>(
        <div key={q.id} style={{ display:'flex', alignItems:'center', gap, marginBottom:Math.round(bsz*0.37) }}>
          {/* บังคับฟอนต์ Arial ให้ตัวเลขข้อ */}
          <span style={{ fontFamily:'"Arial", sans-serif', width:numW, fontSize:10.5, fontWeight:600, color:'#222',
            textAlign:'right', paddingRight:3, flexShrink:0 }}>{startNum+idx}</span>
          {Array.from({length:optCount},(_,i)=>(
            <div key={i} style={{
              width:bsz, height:bsz, borderRadius:'50%',
              border:'1px solid #444', background:'white', flexShrink:0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', // จัดกึ่งกลางด้วย Flexbox
              boxSizing: 'border-box'
            }}>
               {/* ใช้ lineHeight:1 + textAlign:center แทน lineHeight:0 เพื่อให้ html2canvas render ตำแหน่งถูกต้อง */}
              <span style={{
                fontFamily:'"Arial", sans-serif', fontSize:bsz*0.4, fontWeight:700, color:'#555',
                lineHeight:1, display:'block', textAlign:'center'
              }}>{LABELS[i]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── OMR Sheet Inner ──────────────────────────────────────────────────────────
function OMRSheetInner({ quiz, questions, copyNum, totalCopies,
  showAnswerKey, schoolName, subtitle, serial, optCount, meta }: {
  quiz:Quiz; questions:Question[]; copyNum:number; totalCopies:number
  showAnswerKey:boolean; schoolName:string; subtitle:string; serial:string; optCount:number
  meta:TeacherMeta
}) {
  const groups: {qs:Question[]; start:number}[] = []
  for (let i=0; i<Math.min(questions.length,60); i+=20)
    groups.push({ qs:questions.slice(i,i+20), start:i+1 })

  const LEFT_W   = 242
  const PAD_L    = 35    
  const PAD_R    = 20    
  const PAGE_MARGIN_TOP = 25 
  const HEADER_H = 80    
  const PAD_T    = 12    
  const PAD_B    = 28
  const vBars    = 26
  const hBars    = 18

  const fieldRow = (label: string, value: string, minW: number, flex=true) => (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, ...(flex?{flex:1}:{flexShrink:0}) }}>
      <span style={{ fontSize:10.5, fontWeight:700, color:'#111', whiteSpace:'nowrap', minWidth:minW }}>{label}</span>
      <div style={{
        ...(flex?{flex:1}:{width:minW+30}),
        borderBottom:'1px solid #888', height:17, fontSize:10, color:'#5a1a9e',
        fontWeight:value?700:400, paddingBottom:1,
        overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
      }}>{value}</div>
    </div>
  )

  return (
    <div style={{
      position:'relative', width:SHEET_W, height:SHEET_H,
      background:'white', fontFamily:'"Sarabun","Noto Sans Thai","Arial",sans-serif',
      color:'#000', boxSizing:'border-box', overflow:'hidden',
    }}>

      {/* ── TOP HEADER BAR ── */}
      <div style={{
        position:'absolute', top:PAGE_MARGIN_TOP, left:PAD_L, right:PAD_R, height:HEADER_H,
        background:'transparent',
        zIndex:4,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        borderTop:'1.5px solid #000',    
        borderBottom:'1.5px solid #000', 
      }}>
        {/* ตรงกลาง: ข้อความเรียงกัน 3 บรรทัด */}
        <div style={{ fontSize:22, fontWeight:900, color:'#000', letterSpacing:'0.02em', lineHeight:1 }}>
          กระดาษคำตอบ
        </div>
        <div style={{ fontSize:15, fontWeight:800, color:'#000', lineHeight:1, marginTop:6 }}>
          {schoolName || 'โรงเรียน / สถาบัน'}
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:'#333', letterSpacing:'0.05em', marginTop:6 }}>
          {subtitle || 'รายละเอียดเพิ่มเติม / OMR ANSWER SHEET'}
        </div>

        {/* ขวา: ช่องเขียนคะแนน */}
        <div style={{
          position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
          background:'white', width: 75, height: 48,
          display:'flex', flexDirection:'column', overflow:'hidden',
          border:'1.5px solid #000', boxSizing: 'border-box'
        }}>
          <div style={{ borderBottom:'1.5px solid #000', color:'#000', fontSize:10, fontWeight:900, textAlign:'center', padding:'2px 0', zIndex:2, background:'white' }}>
            คะแนน
          </div>
          <div style={{ flex:1, position:'relative' }}>
             {/* ใช้ SVG แทน CSS Gradient เพื่อแก้ปัญหาเส้นขีดเฉียงเคลื่อนตอนเรนเดอร์ PDF */}
             <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
               <line x1="0" y1="100%" x2="100%" y2="0" stroke="black" strokeWidth="1.5" />
             </svg>
          </div>
        </div>
      </div>

      {/* ── Left timing marks (start below header) ── */}
      <div style={{
        position:'absolute', top:PAGE_MARGIN_TOP+HEADER_H+4, bottom:25, left:8, width:14,
        display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:2,
      }}>
        {Array.from({length:vBars},(_,i)=>(
          <div key={i} style={{ width:'100%', height:10, background:'#000' }}/>
        ))}
      </div>

      {/* ── Bottom timing marks ── */}
      <div style={{
        position:'absolute', bottom:8, left:PAD_L, right:PAD_R,
        height:14, display:'flex', justifyContent:'space-between', zIndex:2,
      }}>
        {Array.from({length:hBars},(_,i)=>(
          <div key={i} style={{ width:12, height:'100%', background:'#000' }}/>
        ))}
      </div>

      {/* ── Inner content ── */}
      <div style={{
        position:'absolute',
        top: PAGE_MARGIN_TOP + HEADER_H + PAD_T, left:PAD_L, right:PAD_R, bottom:PAD_B,
        display:'flex', flexDirection:'column',
      }}>

        {/* Instruction */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:7 }}>
          <div style={{ fontSize:9.5, color:'#333', lineHeight:1.5, textAlign:'right' }}>
            ระบายคำตอบที่ถูกที่สุดให้ชัดเจนด้วยดินสอ 2B ขึ้นไป&nbsp;·&nbsp;กรณีต้องการเปลี่ยนคำตอบ ให้ลบคำตอบเดิมออกให้สะอาด และระวังกระดาษขาด
          </div>
        </div>

        {/* Main 2-column row */}
        <div style={{ display:'flex', flex:1, gap:10, overflow:'hidden', minHeight:0 }}>

          {/* ══ LEFT PANEL ══ */}
          <div style={{
            width:LEFT_W, minWidth:LEFT_W, maxWidth:LEFT_W,
            display:'flex', flexDirection:'column', gap:7, flexShrink:0,
          }}>

            {/* ── ส่วนหัวข้อกระดาษ (ข้อมูลนักเรียน & การสอบ) ── */}
            <div style={{ border:'1.5px solid #5a1a9e', borderRadius:6, padding:'10px',
              display:'flex', flexDirection:'column', gap:8, background:'#faf8ff' }}>

              {/* 1. ส่วนข้อมูลนักเรียน */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, paddingBottom:8, borderBottom:'1px dashed #c4b5fd' }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#5a1a9e', whiteSpace:'nowrap', minWidth:48 }}>ชื่อ-สกุล</span>
                  <div style={{ flex:1, borderBottom:'1px dotted #666', height:17 }}/>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:4, flex:1 }}>
                    <span style={{ fontSize:10.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>ชั้น/ระดับ</span>
                    <div style={{ flex:1, borderBottom:'1px dotted #666', height:17 }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:4, width:75 }}>
                    <span style={{ fontSize:10.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>เลขที่</span>
                    <div style={{ flex:1, borderBottom:'1px dotted #666', height:17 }}/>
                  </div>
                </div>
              </div>

              {/* 2. ส่วนข้อมูลการสอบ */}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {fieldRow('วิชา', meta.subject, 24)}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>รหัส</span>
                    <div style={{ width:45, borderBottom:'1px solid #888', height:17, fontSize:10,
                      color:'#5a1a9e', fontWeight:700, paddingBottom:1, textAlign:'center' }}>
                      {meta.subjectCode}
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:6 }}>
                  {fieldRow('วันที่', meta.examDate, 28)}
                  {fieldRow('เวลา', meta.examTime, 24)}
                </div>

                {/* ห้องสอบ + เวลาที่ใช้ */}
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:3, flex:1 }}>
                     <span style={{ fontSize:9.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>ห้องสอบ</span>
                     <div style={{ flex:1, borderBottom:'1px solid #888', height:17, fontSize:10,
                       color:'#333', paddingBottom:1, textAlign:'center', overflow:'hidden', whiteSpace:'nowrap' }}>{meta.room}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>นาที</span>
                    <div style={{ width:35, borderBottom:'1px solid #888', height:17, fontSize:10,
                      color:'#333', paddingBottom:1, textAlign:'center' }}>
                      {meta.examDuration}
                    </div>
                  </div>
                </div>

                {meta.note && (
                  <div style={{ display:'flex', alignItems:'flex-end', gap:3 }}>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#111', whiteSpace:'nowrap' }}>หมายเหตุ</span>
                    <div style={{ flex:1, borderBottom:'1px solid #888', height:17, fontSize:9,
                      color:'#e11d48', fontWeight:700, paddingBottom:1, overflow:'hidden', whiteSpace:'nowrap' }}>{meta.note}</div>
                  </div>
                )}
              </div>

              {/* 3. ลายเซ็นต์ */}
              <div style={{ display:'flex', gap:8, paddingTop:6 }}>
                <div style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:8.5, color:'#444' }}>ลงชื่อ..............................</div>
                  <div style={{ fontSize:8, color:'#777' }}>(ผู้เข้าสอบ)</div>
                </div>
                <div style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:8.5, color:'#444' }}>ลงชื่อ..............................</div>
                  <div style={{ fontSize:8, color:'#777' }}>(ผู้คุมสอบ)</div>
                </div>
              </div>
            </div>

            {/* Digit grids */}
            <div style={{ display:'flex', gap:4, alignItems:'flex-start', justifyContent:'center' }}>
              <DigitGrid cols={6} label="รหัสวิชา"        bsz={13.5}/>
              <DigitGrid cols={8} label="เลขประจำตัวสอบ"  bsz={13.5}/>
            </div>

            {/* ชุดที่ */}
            {totalCopies>1 && (
              <div style={{ background:'#5a1a9e', color:'white', borderRadius:4,
                padding:'4px 12px', fontSize:12, fontWeight:900,
                alignSelf:'center', letterSpacing:'0.04em' }}>
                ชุดที่ {copyNum}/{totalCopies}
              </div>
            )}

            {/* ── Barcode ── (ต่อจากชุดที่) */}
            <div style={{ marginTop:2 }}>
              <QRCodeCanvas value={serial} size={96} />
            </div>

          </div>{/* end LEFT PANEL */}

          {/* ══ RIGHT: answer columns ══ */}
          <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexShrink:0 }}>
              {groups.map((g,gi)=>(
                <AnswerGroup key={gi} questions={g.qs} startNum={g.start} optCount={optCount} bsz={19}/>
              ))}
            </div>
          </div>

        </div>{/* end main row */}

        {/* Answer key */}
        {showAnswerKey && (
          <div style={{ borderTop:'1.5px dashed #c4b5fd', background:'#faf8ff',
            padding:'5px 8px', display:'flex', flexWrap:'wrap',
            gap:5, alignItems:'flex-start', marginTop:8 }}>
            <span style={{ fontSize:10, fontWeight:900, color:'#5a1a9e',
              whiteSpace:'nowrap', marginRight:4 }}>🔑 เฉลย</span>
            {questions.map(q=>{
              const label=LABELS[parseInt(q.correct_answer,10)]??'?'
              return (
                <span key={q.id} style={{ fontSize:10, fontWeight:700,
                  display:'flex', alignItems:'center', gap:2 }}>
                  <span style={{ color:'#bbb' }}>{q.order}.</span>
                  <span style={{ padding:'0 4px', borderRadius:3,
                    background:'#5a1a9e', color:'white', fontSize:9 }}>{label}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>{/* end inner */}
    </div>
  )
}

// ─── Scale wrapper ────────────────────────────────────────────────────────────
function SheetScaleWrap({ children, containerWidth }: { children:React.ReactNode; containerWidth:number }) {
  const scale = containerWidth>0 ? Math.min(1,(containerWidth-32)/SHEET_W) : 1
  return (
    <div style={{ width:SHEET_W*scale, height:SHEET_H*scale,
      overflow:'hidden', flexShrink:0, background:'white',
      boxShadow:'0 4px 20px rgba(107,33,168,0.15)', borderRadius:3 }}>
      <div style={{ width:SHEET_W, height:SHEET_H,
        transform:`scale(${scale})`, transformOrigin:'top left' }}>
        {children}
      </div>
    </div>
  )
}

// ─── PDF Preview Modal ────────────────────────────────────────────────────────
function PDFPreviewModal({ pdfUrl, filename, onClose, onDownload }: {
  pdfUrl:string; filename:string; onClose:()=>void; onDownload:()=>void
}) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999,
      background:'rgba(10,0,25,0.85)', backdropFilter:'blur(6px)',
      display:'flex', flexDirection:'column', alignItems:'center', 
      paddingTop:'2vh' 
    }}>
      <div style={{ background:'#1e1030', border:'1.5px solid #6b21a8', borderRadius:14,
        boxShadow:'0 8px 60px rgba(107,33,168,0.5)',
        width:'min(96vw,1000px)', height:'94vh', 
        display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10,
          padding:'12px 18px', borderBottom:'1px solid #4a1080',
          background:'#2d1050', flexShrink:0 }}>
          <span style={{ fontSize:18 }}>📄</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#e9d5ff' }}>ตัวอย่าง PDF</div>
            <div style={{ fontSize:10, color:'#a78bfa' }}>{filename}</div>
          </div>
          <button onClick={onDownload} style={{ background:'#6b21a8', color:'white', border:'none',
            borderRadius:8, padding:'8px 20px', fontWeight:800, fontSize:12, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 12px rgba(107,33,168,0.5)' }}>
            ⬇️ ดาวน์โหลด PDF</button>
          <button onClick={onClose} style={{ background:'transparent', color:'#a78bfa',
            border:'1px solid #4a1080', borderRadius:7, padding:'7px 14px',
            fontWeight:700, fontSize:12, cursor:'pointer' }}>✕ ปิด</button>
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <iframe src={`${pdfUrl}#view=FitH`} style={{ width:'100%', height:'100%', border:'none' }} title="PDF Preview"/>
        </div>
      </div>
    </div>
  )
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_QUIZ:Quiz = {id:'1',title:'R2202A',pass_score:60,time_limit:60}
const DEMO_Q:Question[] = Array.from({length:200},(_,i)=>({
  id:String(i),type:'mcq',question_text:`ข้อ ${i+1}`,
  correct_answer:String(Math.floor(Math.random()*5)),
  quiz_id:'1',order:i+1,
}))

// ─── OMRSheetGenerator ────────────────────────────────────────────────────────
export default function OMRSheetGenerator({ onClose }: { onClose?: () => void }) {
  const supabase = createClient()
  const [copies,setCopies]       = useState(3)
  const [showAK,setShowAK]       = useState(false)
  const [quizTitle,setQuizTitle] = useState(DEMO_QUIZ.title)
  const [school,setSchool]       = useState('โรงเรียน / สถาบัน')
  const [subtitle,setSubtitle]   = useState('รายละเอียดเพิ่มเติม / OMR ANSWER SHEET')
  const [numQ,setNumQ]           = useState(60)
  const [optCount,setOpt]        = useState(5)
  const [prefix,setPrefix]       = useState('R')
  const [year,setYear]           = useState(new Date().getFullYear()+543)
  const [startSeq,setStartSeq]   = useState(1)
  const [useSerial,setUseSerial] = useState(true)
  const [meta,setMeta]           = useState<TeacherMeta>({
    subject:'', subjectCode:'', examDate:'', examTime:'', examDuration:'', room:'', note:'',
  })
  const [showMetaPanel,setShowMetaPanel] = useState(false)
  const [contW,setContW]         = useState(0)
  const contRef = useRef<HTMLDivElement>(null)
  const [isGenerating,setIsGenerating] = useState(false)
  const [progress,setProgress]         = useState(0)
  const [pdfUrl,setPdfUrl]             = useState<string|null>(null)
  const [pdfFilename,setPdfFilename]   = useState('')
  const [showPreview,setShowPreview]   = useState(false)

  // ── Supabase save + history states ──
  const [saving,setSaving]             = useState(false)
  const [savedOk,setSavedOk]           = useState(false)
  const [showHistory,setShowHistory]   = useState(false)
  const [batches,setBatches]           = useState<SheetBatch[]>([])
  const [loadingHistory,setLoadingHistory] = useState(false)
  const [expandedBatch,setExpandedBatch]   = useState<string|null>(null)

  const updateMeta = (k: keyof TeacherMeta, v: string) => setMeta(p=>({...p,[k]:v}))

  // ── บันทึก batch ลง Supabase ──────────────────────────────────
  const saveBatch = async (serialList: string[]) => {
    if (!useSerial || serialList.length === 0) return
    setSaving(true); setSavedOk(false)
    try {
      const payload = {
        exam_title:    quizTitle,
        exam_id:       null as string | null,
        school:        school,
        subject_code:  quizTitle,
        num_questions: numQ,
        options_per_q: optCount,
        copies:        copies,
        serials:       serialList,
        prefix:        prefix,
        year_bce:      year,
        start_seq:     startSeq,
      }
      const { error } = await supabase.from('omr_sheet_batches').insert(payload)
      if (error) throw error
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 4000)
      // อัปเดต startSeq ให้ไม่ซ้ำกับชุดถัดไป
      setStartSeq(p => p + copies)
    } catch (err) {
      console.error('saveBatch error', err)
    } finally {
      setSaving(false)
    }
  }

  // ── โหลดประวัติ batches ────────────────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('omr_sheet_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setBatches((data ?? []) as SheetBatch[])
    setLoadingHistory(false)
  }

  // ── ลบ batch ──────────────────────────────────────────────────
  const deleteBatch = async (batchId: string) => {
    if (!window.confirm('ลบประวัตินี้ใช่ไหม?')) return
    const { error } = await supabase.from('omr_sheet_batches').delete().eq('id', batchId)
    if (!error) {
      setBatches(prev => prev.filter(b => b.id !== batchId))
      if (expandedBatch === batchId) setExpandedBatch(null)
    } else {
      alert('ลบไม่สำเร็จ: ' + error.message)
    }
  }

  // ── โหลด PDF ย้อนหลังจากประวัติ ─────────────────────────────
  const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null)

  const downloadBatchPDF = async (b: SheetBatch) => {
    if (downloadingBatch) return
    setDownloadingBatch(b.id)

    const batchQuiz: Quiz = { id: b.exam_id ?? '1', title: b.exam_title, pass_score: 60, time_limit: 60 }
    const batchOpt = b.options_per_q
    const batchQuestions: Question[] = DEMO_Q.slice(0, Math.min(b.num_questions, 60)).map(q => ({
      ...q,
      correct_answer: String(parseInt(q.correct_answer, 10) % batchOpt),
      options: Array.from({ length: batchOpt }, (_, i) => ({ label: LABELS[i] })),
    }))
    const batchMeta: TeacherMeta = {
      subject: '', subjectCode: b.subject_code,
      examDate: '', examTime: '', examDuration: '', room: '', note: '',
    }

    const overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:10001',
      'background:#0f0720',
      'display:flex','flex-direction:column',
      'align-items:center','justify-content:center','gap:12px',
    ].join(';')
    overlay.innerHTML = `
      <div style="color:#e9d5ff;font-size:16px;font-weight:800;font-family:sans-serif">⏳ กำลังเตรียม PDF…</div>
      <div style="width:260px;height:6px;background:#2d1050;border-radius:4px;overflow:hidden">
        <div id="omr-ol-bar2" style="height:100%;width:30%;background:linear-gradient(90deg,#6b21a8,#a855f7);transition:width 0.3s;border-radius:4px"></div>
      </div>
      <div style="color:#c4b5fd;font-size:11px;font-family:sans-serif;margin-top:10px;text-align:center;line-height:1.7">
        เมื่อหน้าต่างพิมพ์ปรากฏ<br>เลือก <b style="color:#e9d5ff">บันทึกเป็น PDF</b> แล้วกด Save
      </div>
    `
    document.body.appendChild(overlay)

    const printStyle = document.createElement('style')
    printStyle.id = 'omr-print-style'
    printStyle.textContent = `
      #omr-print-root { display:none; }
      @media print {
        body > *:not(#omr-print-root) { display:none !important; }
        #omr-print-root { display:block !important; margin:0; padding:0; }
        @page { size:A4 portrait; margin:0; }
        .omr-sheet-page {
          width:794px; height:1123px; page-break-after:always; overflow:hidden;
          -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;
        }
        .omr-sheet-page:last-child { page-break-after:avoid; }
      }
    `
    document.head.appendChild(printStyle)

    const printRoot = document.createElement('div')
    printRoot.id = 'omr-print-root'
    document.body.appendChild(printRoot)

    try {
      const { createRoot } = await import('react-dom/client')
      const root = createRoot(printRoot)
      await new Promise<void>(res => {
        root.render(
          <>
            {b.serials.map((serial, ci) => (
              <div key={ci} className="omr-sheet-page">
                <OMRSheetInner
                  quiz={batchQuiz} questions={batchQuestions}
                  copyNum={ci + 1} totalCopies={b.copies}
                  showAnswerKey={false}
                  schoolName={b.school} subtitle=""
                  serial={serial} optCount={batchOpt} meta={batchMeta}
                />
              </div>
            ))}
          </>
        )
        requestAnimationFrame(() => document.fonts.ready.then(() => setTimeout(res, 1500)))
      })
      document.body.removeChild(overlay)
      window.print()
      root.unmount()
    } catch (err) {
      console.error(err); alert('เกิดข้อผิดพลาด:\n' + String(err))
      if (document.body.contains(overlay)) document.body.removeChild(overlay)
    } finally {
      document.getElementById('omr-print-root')?.remove()
      document.getElementById('omr-print-style')?.remove()
      setDownloadingBatch(null)
    }
  }

  const toggleHistory = () => {
    const next = !showHistory
    setShowHistory(next)
    if (next) loadHistory()
  }


  useEffect(()=>{
    if (typeof ResizeObserver==='undefined'||!contRef.current) return
    const ro=new ResizeObserver(e=>{ if(e[0]) setContW(e[0].contentRect.width) })
    ro.observe(contRef.current); return ()=>ro.disconnect()
  },[])
  useEffect(()=>{ return ()=>{ if(pdfUrl) URL.revokeObjectURL(pdfUrl) } },[pdfUrl])

  const quiz:Quiz = {...DEMO_QUIZ,title:quizTitle}
  const questions:Question[] = DEMO_Q.slice(0,Math.min(numQ,60)).map(q=>({
    ...q, correct_answer:String(parseInt(q.correct_answer,10)%optCount),
    options:Array.from({length:optCount},(_,i)=>({label:LABELS[i]})),
  }))

  const inp:CSSProperties = { padding:'4px 7px', borderRadius:6, border:'1.5px solid #ddd',
    fontSize:11, outline:'none', color:'#222', background:'white' }
  const row:CSSProperties  = {display:'flex',alignItems:'center',gap:5}
  const cap:CSSProperties  = {fontSize:11,fontWeight:700,color:'#5a1a9e',whiteSpace:'nowrap'}
  const previewSerials = Array.from({length:Math.min(copies,50)},(_,i)=>genSerial(prefix,year,startSeq+i))

  const handleGeneratePDF = async () => {
    setIsGenerating(true); setProgress(0)
    // ── ใช้ browser print engine โดยตรง → ผลลัพธ์เหมือนหน้าเว็บ 100% ──
    const overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:10001',
      'background:#0f0720',
      'display:flex','flex-direction:column',
      'align-items:center','justify-content:center','gap:12px',
    ].join(';')
    overlay.innerHTML = `
      <div style="color:#e9d5ff;font-size:16px;font-weight:800;font-family:sans-serif">⏳ กำลังเตรียม PDF…</div>
      <div style="width:260px;height:6px;background:#2d1050;border-radius:4px;overflow:hidden">
        <div id="omr-ol-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#6b21a8,#a855f7);transition:width 0.3s;border-radius:4px"></div>
      </div>
      <div id="omr-ol-pct" style="color:#a78bfa;font-size:12px;font-family:sans-serif">0%</div>
      <div style="color:#c4b5fd;font-size:11px;font-family:sans-serif;margin-top:10px;text-align:center;line-height:1.7">
        เมื่อหน้าต่างพิมพ์ปรากฏ<br>เลือก <b style="color:#e9d5ff">บันทึกเป็น PDF</b> แล้วกด Save
      </div>
    `
    document.body.appendChild(overlay)
    const olBar = overlay.querySelector('#omr-ol-bar') as HTMLElement
    const olPct = overlay.querySelector('#omr-ol-pct') as HTMLElement
    const setOL = (p:number) => { if(olBar) olBar.style.width=p+'%'; if(olPct) olPct.textContent=p+'%' }

    // Inject @media print CSS
    const printStyle = document.createElement('style')
    printStyle.id = 'omr-print-style'
    printStyle.textContent = `
      #omr-print-root { display:none; }
      @media print {
        body > *:not(#omr-print-root) { display:none !important; }
        #omr-print-root { display:block !important; margin:0; padding:0; }
        @page { size:A4 portrait; margin:0; }
        .omr-sheet-page {
          width:794px; height:1123px;
          page-break-after:always;
          overflow:hidden;
          -webkit-print-color-adjust:exact !important;
          print-color-adjust:exact !important;
        }
        .omr-sheet-page:last-child { page-break-after:avoid; }
      }
    `
    document.head.appendChild(printStyle)

    const printRoot = document.createElement('div')
    printRoot.id = 'omr-print-root'
    document.body.appendChild(printRoot)

    try {
          const {createRoot} = await import('react-dom/client')
      setProgress(30); setOL(30)

      const root = createRoot(printRoot)
      await new Promise<void>(res => {
        root.render(
          <>
            {Array.from({length:copies}, (_,ci) => {
              const serial = useSerial ? genSerial(prefix,year,startSeq+ci) : quiz.title.toUpperCase()
              return (
                <div key={ci} className="omr-sheet-page">
                  <OMRSheetInner quiz={quiz} questions={questions}
                    copyNum={ci+1} totalCopies={copies} showAnswerKey={showAK}
                    schoolName={school} subtitle={subtitle} serial={serial} optCount={optCount} meta={meta}/>
                </div>
              )
            })}
          </>
        )
        // รอ font + QR Code render เสร็จ
        requestAnimationFrame(() => document.fonts.ready.then(() => setTimeout(res, 1500)))
      })

      setProgress(90); setOL(90)
      document.body.removeChild(overlay)  // ลบ overlay ก่อน print dialog โผล่
      window.print()
      root.unmount()
      // ── บันทึก serials หลัง print สำเร็จ ──
      const serialList = Array.from({length:copies}, (_,ci) =>
        useSerial ? genSerial(prefix,year,startSeq+ci) : quizTitle.toUpperCase()
      )
      await saveBatch(serialList)
    } catch(err) {
      console.error(err); alert('เกิดข้อผิดพลาด:\n'+String(err))
      if(document.body.contains(overlay)) document.body.removeChild(overlay)
    } finally {
      document.getElementById('omr-print-root')?.remove()
      document.getElementById('omr-print-style')?.remove()
      setIsGenerating(false); setProgress(0)
    }
  }

  const handleDownload = () => { /* ใช้ window.print() แทน */ }

  return (
    <div style={{ fontFamily:'"Sarabun","Noto Sans Thai",sans-serif', minHeight:'100vh', background:'#f4f0fb' }}>

      {/* ══ Toolbar ══ */}
      <div style={{ position:'sticky',top:0,zIndex:50,background:'white',
        borderBottom:'1.5px solid #e0d8f5',padding:'7px 14px',
        display:'flex',flexWrap:'wrap',gap:7,alignItems:'center',
        boxShadow:'0 2px 10px rgba(107,33,168,0.1)' }}>

        {/* ── ปุ่มย้อนกลับ ── */}
        {onClose && (
          <button onClick={onClose} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'5px 11px', borderRadius:7, border:'1.5px solid #ddd',
            background:'white', color:'#555', fontWeight:700, fontSize:11,
            cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
          }}>← ย้อนกลับ</button>
        )}

        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:28,height:28,borderRadius:7,background:'#6b21a8',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📋</div>
          <div>
            <div style={{fontSize:12,fontWeight:900,color:'#6b21a8',lineHeight:1.1}}>OMR Generator</div>
            <div style={{fontSize:9,color:'#aaa'}}>กระดาษคำตอบ A4 · QR Code</div>
          </div>
        </div>
        <div style={{width:1,height:28,background:'#eee',flexShrink:0}}/>

        <label style={row}><span style={cap}>สถาบัน</span>
          <input value={school} onChange={e=>setSchool(e.target.value)} style={{...inp,width:150}}/></label>
        <label style={row}><span style={cap}>ข้อความรอง</span>
          <input value={subtitle} onChange={e=>setSubtitle(e.target.value)} style={{...inp,width:150}}/></label>
        <label style={row}><span style={cap}>รหัสวิชา</span>
          <input value={quizTitle} onChange={e=>setQuizTitle(e.target.value)} style={{...inp,width:72}}/></label>
        <label style={row}><span style={cap}>ข้อ (max 60)</span>
          <input type="number" min={1} max={60} value={numQ}
            onChange={e=>setNumQ(Math.max(1,Math.min(60,Number(e.target.value))))}
            style={{...inp,width:50,textAlign:'center'}}/></label>
        <label style={row}><span style={cap}>ตัวเลือก</span>
          <select value={optCount} onChange={e=>setOpt(Number(e.target.value))} style={inp}>
            {[3,4,5].map(n=><option key={n} value={n}>{n} ตัวเลือก</option>)}
          </select></label>
        <label style={row}><span style={cap}>ชุด</span>
          <input type="number" min={1} max={9999} value={copies}
            onChange={e=>setCopies(Math.max(1,Math.min(9999,Number(e.target.value))))}
            style={{...inp,width:56,textAlign:'center'}}/></label>

        <div style={{width:1,height:28,background:'#eee',flexShrink:0}}/>

        <label style={{...row,cursor:'pointer'}}>
          <input type="checkbox" checked={useSerial} onChange={e=>setUseSerial(e.target.checked)}
            style={{width:13,height:13,accentColor:'#6b21a8'}}/>
          <span style={cap}>Serial</span></label>
        {useSerial&&<>
          <label style={row}><span style={{...cap,fontSize:10}}>คำนำหน้า</span>
            <input value={prefix}
              onChange={e=>setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4))}
              style={{...inp,width:40}}/></label>
          <label style={row}><span style={{...cap,fontSize:10}}>ปี พ.ศ.</span>
            <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))}
              style={{...inp,width:56}}/></label>
          <label style={row}><span style={{...cap,fontSize:10}}>เริ่มที่</span>
            <input type="number" min={1} max={9999} value={startSeq}
              onChange={e=>setStartSeq(Math.max(1,Number(e.target.value)))}
              style={{...inp,width:50,textAlign:'center'}}/></label>
          <div style={{ fontSize:10,color:'#5a1a9e',fontWeight:700,
            background:'#ede9fe',borderRadius:5,padding:'3px 9px',
            border:'1px solid #c4b5fd',letterSpacing:'0.04em' }}>
            {previewSerials[0]}{copies>1&&` – ${previewSerials[previewSerials.length-1]}`}
          </div>
        </>}

        <div style={{width:1,height:28,background:'#eee',flexShrink:0}}/>
        <label style={{...row,cursor:'pointer'}}>
          <input type="checkbox" checked={showAK} onChange={e=>setShowAK(e.target.checked)}
            style={{width:13,height:13,accentColor:'#6b21a8'}}/>
          <span style={cap}>แสดงเฉลย</span></label>

        {/* ✏️ Teacher meta toggle */}
        <button onClick={()=>setShowMetaPanel(p=>!p)} style={{
          background: showMetaPanel?'#6b21a8':'white',
          color: showMetaPanel?'white':'#6b21a8',
          border:'1.5px solid #6b21a8', borderRadius:7,
          padding:'5px 12px', fontWeight:700, fontSize:11, cursor:'pointer',
        }}>✏️ รายละเอียดข้อสอบ</button>

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {/* สถานะบันทึก */}
          {saving && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#5a1a9e', fontWeight:700 }}>
              <span style={{ width:12,height:12,borderRadius:'50%',border:'2px solid #c4b5fd',borderTopColor:'#6b21a8',display:'inline-block',animation:'omrg-spin 0.7s linear infinite' }}/>
              กำลังบันทึก...
            </div>
          )}
          {savedOk && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#059669', fontWeight:700,
              background:'rgba(5,150,105,0.08)', padding:'4px 10px', borderRadius:6, border:'1px solid rgba(5,150,105,0.2)' }}>
              ✓ บันทึก Serial แล้ว
            </div>
          )}

          {/* ปุ่มประวัติ */}
          <button onClick={toggleHistory} style={{
            background: showHistory ? '#6b21a8' : 'white',
            color: showHistory ? 'white' : '#6b21a8',
            border:'1.5px solid #6b21a8', borderRadius:8,
            padding:'7px 13px', fontWeight:700, fontSize:12,
            cursor:'pointer', display:'flex', alignItems:'center', gap:5,
          }}>
            <span style={{ fontSize:13 }}>🗂</span> ประวัติ
            {showHistory ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>

          {pdfUrl&&!showPreview&&(
            <button onClick={()=>setShowPreview(true)} style={{
              background:'white',color:'#6b21a8',border:'1.5px solid #6b21a8',
              borderRadius:8,padding:'7px 14px',fontWeight:700,fontSize:12,
              cursor:'pointer',display:'flex',alignItems:'center',gap:5 }}>👁 ดูตัวอย่าง</button>
          )}
          <button onClick={handleGeneratePDF} disabled={isGenerating} style={{
            background:isGenerating?'#9ca3af':'#6b21a8',color:'white',border:'none',
            borderRadius:8,padding:'7px 18px',fontWeight:800,fontSize:12,
            cursor:isGenerating?'not-allowed':'pointer',
            display:'flex',alignItems:'center',gap:6,
            boxShadow:'0 2px 8px rgba(107,33,168,0.3)',transition:'background 0.2s' }}>
            {isGenerating?`⏳ กำลังสร้าง PDF… ${progress}%`:`⬇️ โหลด PDF${copies>1?` (${copies} ชุด)`:''}`}
          </button>
        </div>
        <style>{`@keyframes omrg-spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* ── Teacher meta panel ── */}
      {showMetaPanel && (
        <div style={{ margin:'8px 14px 0', background:'white', borderRadius:10,
          border:'1.5px solid #6b21a8', padding:'14px 18px',
          boxShadow:'0 2px 12px rgba(107,33,168,0.12)' }}>
          <div style={{fontSize:12,fontWeight:900,color:'#6b21a8',marginBottom:12}}>
            ✏️ รายละเอียดข้อสอบ (แสดงบนกระดาษคำตอบ)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {([
              {k:'subject',      label:'ชื่อวิชา',          ph:'คณิตศาสตร์ ม.3'},
              {k:'subjectCode',  label:'รหัสวิชา',          ph:'ค23101'},
              {k:'examDate',     label:'วันที่สอบ',         ph:'15 มิ.ย. 2568'},
              {k:'examTime',     label:'เวลาสอบ',            ph:'09:00–11:00 น.'},
              {k:'examDuration', label:'เวลาที่ใช้ (นาที)', ph:'120'},
              {k:'room',         label:'ห้องสอบ',            ph:'ห้อง 301'},
              {k:'note',         label:'หมายเหตุ',           ph:'ห้ามนำเครื่องคิดเลข'},
            ] as {k:keyof TeacherMeta;label:string;ph:string}[]).map(f=>(
              <label key={f.k} style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:'#5a1a9e' }}>{f.label}</span>
                <input value={meta[f.k]} onChange={e=>updateMeta(f.k,e.target.value)}
                  placeholder={f.ph} style={{
                    padding:'5px 8px', borderRadius:6, border:'1.5px solid #ddd',
                    fontSize:11, outline:'none', color:'#222', background:'white' }}/>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── History Panel ── */}
      {showHistory && (
        <div style={{ margin:'8px 14px 0', background:'white', borderRadius:12,
          border:'1.5px solid #c4b5fd', boxShadow:'0 4px 20px rgba(107,33,168,0.1)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'#6b21a8', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:900, color:'white', flex:1 }}>🗂 ประวัติการสร้างกระดาษ</span>
            <button onClick={() => setShowHistory(false)} style={{
              background:'rgba(255,255,255,0.15)', border:'none', color:'white',
              width:24, height:24, borderRadius:'50%', cursor:'pointer', fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {loadingHistory ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
              <span style={{ display:'inline-block', width:20, height:20, borderRadius:'50%',
                border:'3px solid #e0d8f5', borderTopColor:'#6b21a8',
                animation:'omrg-spin 0.7s linear infinite', marginBottom:8 }}/>
              <br/>กำลังโหลดประวัติ...
            </div>
          ) : batches.length === 0 ? (
            <div style={{ padding:'40px 16px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
              <p style={{ fontSize:13, color:'#9ca3af', fontWeight:600 }}>ยังไม่มีประวัติการสร้างกระดาษ</p>
              <p style={{ fontSize:11, color:'#c4b5fd' }}>หลังโหลด PDF จะบันทึกอัตโนมัติที่นี่</p>
            </div>
          ) : (
            <div style={{ maxHeight:420, overflowY:'auto' }}>
              {batches.map((b, bi) => (
                <div key={b.id} style={{
                  borderBottom: bi < batches.length-1 ? '1px solid #f3f0ff' : 'none',
                }}>
                  {/* Batch header row */}
                  <div
                    onClick={() => setExpandedBatch(expandedBatch === b.id ? null : b.id)}
                    style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10,
                      cursor:'pointer', background: expandedBatch === b.id ? '#faf5ff' : 'white',
                      transition:'background 0.15s',
                    }}
                  >
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:800, fontSize:13, color:'#3b0764' }}>
                          {b.exam_title || b.subject_code}
                        </span>
                        <span style={{ fontSize:10, fontWeight:700, background:'#ede9fe',
                          color:'#6b21a8', borderRadius:4, padding:'1px 7px', border:'1px solid #c4b5fd' }}>
                          {b.copies} ชุด
                        </span>
                        <span style={{ fontSize:10, color:'#9ca3af' }}>
                          {b.num_questions}ข้อ · {b.options_per_q}ตัวเลือก
                        </span>
                        {b.serials.length > 0 && (
                          <span style={{ fontFamily:'monospace', fontSize:10, fontWeight:700,
                            color:'#5a1a9e', background:'rgba(107,33,168,0.06)',
                            padding:'1px 6px', borderRadius:4 }}>
                            {b.serials[0]}
                            {b.serials.length > 1 && ` – ${b.serials[b.serials.length-1]}`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>
                        {b.school && <>{b.school} · </>}
                        {new Date(b.created_at).toLocaleDateString('th-TH', {
                          day:'numeric', month:'short', year:'2-digit',
                          hour:'2-digit', minute:'2-digit'
                        })}
                      </div>
                    </div>
                    <span style={{ color:'#c4b5fd', fontSize:13, transition:'transform 0.2s',
                      transform: expandedBatch===b.id ? 'rotate(180deg)' : 'none' }}>▾</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteBatch(b.id) }}
                      title="ลบประวัตินี้"
                      style={{
                        background:'transparent', border:'1px solid rgba(239,68,68,0.3)',
                        color:'#ef4444', borderRadius:6, width:26, height:26,
                        fontSize:12, cursor:'pointer', display:'flex',
                        alignItems:'center', justifyContent:'center', flexShrink:0,
                        transition:'all 0.15s',
                      }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.1)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                    >🗑</button>
                  </div>

                  {/* Expanded: serial list */}
                  {expandedBatch === b.id && (
                    <div style={{ padding:'8px 16px 14px', background:'#faf5ff',
                      borderTop:'1px solid #ede9fe' }}>
                      <p style={{ fontSize:10, fontWeight:800, color:'#6b21a8',
                        textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 8px' }}>
                        รหัสกระดาษทั้งหมด ({b.serials.length} รหัส)
                      </p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, maxHeight:140, overflowY:'auto' }}>
                        {b.serials.map((s, si) => (
                          <span key={si} style={{ fontSize:10, fontWeight:700,
                            background:'white', color:'#5a1a9e',
                            borderRadius:4, padding:'2px 8px',
                            border:'1px solid #c4b5fd', fontFamily:'monospace',
                            letterSpacing:'0.04em' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                      {/* ปุ่ม copy all serials + download PDF */}
                      <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(b.serials.join('\n'))
                            .then(() => alert('คัดลอก ' + b.serials.length + ' รหัสแล้ว'))
                          }}
                          style={{ padding:'5px 14px', borderRadius:6,
                            background:'white', color:'#6b21a8',
                            border:'1.5px solid #6b21a8',
                            fontSize:11, fontWeight:700, cursor:'pointer',
                            display:'flex', alignItems:'center', gap:5 }}>
                          📋 คัดลอกรหัสทั้งหมด
                        </button>
                        <button
                          onClick={() => downloadBatchPDF(b)}
                          disabled={downloadingBatch === b.id}
                          style={{
                            padding:'5px 16px', borderRadius:6,
                            background: downloadingBatch === b.id ? '#9ca3af' : '#6b21a8',
                            color:'white', border:'none',
                            fontSize:11, fontWeight:700,
                            cursor: downloadingBatch === b.id ? 'not-allowed' : 'pointer',
                            display:'flex', alignItems:'center', gap:5,
                            boxShadow:'0 2px 8px rgba(107,33,168,0.3)',
                            transition:'background 0.2s',
                          }}>
                          {downloadingBatch === b.id ? '⏳ กำลังเตรียม...' : '⬇️ โหลด PDF ย้อนหลัง'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isGenerating&&(
        <div style={{ height:3, background:'#ede9fe', marginTop:4 }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#6b21a8,#a855f7)',
            width:`${progress}%`, transition:'width 0.3s ease', borderRadius:'0 2px 2px 0' }}/>
        </div>
      )}

      <div style={{ margin:'8px 14px 0', padding:'6px 12px', background:'#ede9fe',
        borderRadius:8, border:'1px solid #c4b5fd', fontSize:11, color:'#5a1a9e',
        fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
        📄 A4 Portrait · QR Code อยู่ใต้ "ชุดที่" ฝั่งซ้าย · สแกน QR Code ได้ทุก browser
      </div>

      {useSerial&&copies>0&&(
        <div style={{ margin:'6px 14px 0', background:'white', borderRadius:8,
          border:'1px solid #e0d8f5', padding:'6px 12px',
          boxShadow:'0 1px 4px rgba(107,33,168,0.06)' }}>
          <div style={{fontSize:11,fontWeight:800,color:'#6b21a8',marginBottom:3}}>
            🗂 รายการรหัสกระดาษ ({copies} ใบ)
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
            {previewSerials.map((s,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,
                background:'#ede9fe',color:'#5a1a9e',
                borderRadius:4,padding:'2px 7px',border:'1px solid #c4b5fd'}}>{s}</span>
            ))}
            {copies>50&&<span style={{fontSize:10,color:'#aaa',alignSelf:'center',fontStyle:'italic'}}>
              ...และอีก {copies-50} รหัส</span>}
          </div>
        </div>
      )}

      <div ref={contRef} style={{ padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        {Array.from({length:Math.min(copies,5)},(_,ci)=>{
          const serial=useSerial?genSerial(prefix,year,startSeq+ci):quiz.title.toUpperCase()
          return (
            <SheetScaleWrap key={ci} containerWidth={contW}>
              <OMRSheetInner quiz={quiz} questions={questions}
                copyNum={ci+1} totalCopies={copies} showAnswerKey={showAK}
                schoolName={school} subtitle={subtitle} serial={serial} optCount={optCount} meta={meta}/>
            </SheetScaleWrap>
          )
        })}
        {copies>5&&(
          <div style={{ padding:'12px 24px', background:'white', borderRadius:8,
            border:'1.5px dashed #c4b5fd', color:'#6b21a8', fontWeight:700, fontSize:13 }}>
            + อีก {copies-5} ชุด (แสดงเฉพาะ 5 ชุดแรก ใน Preview)
          </div>
        )}
      </div>

      {showPreview&&pdfUrl&&(
        <PDFPreviewModal pdfUrl={pdfUrl} filename={pdfFilename}
          onClose={()=>setShowPreview(false)} onDownload={handleDownload}/>
      )}
    </div>
  )
}