"use client"

import { useState, useEffect, useRef, CSSProperties } from "react"

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
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js')
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
function genSerial(prefix: string, year: number, seq: number) {
  return `${prefix}${String(year).slice(-2)}${String(seq).padStart(4,'0')}`
}

// ─── Barcode on <canvas> — html2canvas captures canvas pixel-perfectly ────────
function BarcodeCanvas({ value, w, h }: { value: string; w: number; h: number }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    const attempt = () => {
      const JsB = (window as any).JsBarcode
      if (!JsB) { setTimeout(attempt, 80); return }
      try {
        JsB(ref.current, value, {
          format: 'CODE128', 
          width: 4,             
          height: (h - 20) * 3, 
          displayValue: true, 
          fontSize: 32,         
          fontOptions: 'bold',
          margin: 10, 
          background: '#ffffff', 
          lineColor: '#000000',
          textMargin: 8, 
          font: 'monospace',
        })
      } catch { /* ignore */ }
    }
    attempt()
  }, [value, w, h])
  return <img ref={ref} style={{ width:w, height:h, display:'block', objectFit:'contain' }} alt="barcode"/>
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
              <BarcodeCanvas value={serial} w={LEFT_W} h={56} />
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

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
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

  const updateMeta = (k: keyof TeacherMeta, v: string) => setMeta(p=>({...p,[k]:v}))

  useEffect(()=>{
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js').catch(()=>{})
  },[])
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
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js')
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
        // รอ font + barcode (JsBarcode polls ทุก 80ms) render เสร็จ
        requestAnimationFrame(() => document.fonts.ready.then(() => setTimeout(res, 700)))
      })

      setProgress(90); setOL(90)
      document.body.removeChild(overlay)  // ลบ overlay ก่อน print dialog โผล่
      window.print()
      root.unmount()
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

        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:28,height:28,borderRadius:7,background:'#6b21a8',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📋</div>
          <div>
            <div style={{fontSize:12,fontWeight:900,color:'#6b21a8',lineHeight:1.1}}>OMR Generator</div>
            <div style={{fontSize:9,color:'#aaa'}}>กระดาษคำตอบ A4 · บาร์โค้ด CODE128</div>
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

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
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

      {isGenerating&&(
        <div style={{ height:3, background:'#ede9fe', marginTop:4 }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#6b21a8,#a855f7)',
            width:`${progress}%`, transition:'width 0.3s ease', borderRadius:'0 2px 2px 0' }}/>
        </div>
      )}

      <div style={{ margin:'8px 14px 0', padding:'6px 12px', background:'#ede9fe',
        borderRadius:8, border:'1px solid #c4b5fd', fontSize:11, color:'#5a1a9e',
        fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
        📄 A4 Portrait · scale 3× PNG · บาร์โค้ดอยู่ใต้ "ชุดที่" ฝั่งซ้าย · ไม่มีรหัสข้างๆ
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