'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Trash2, Eye, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile { id:string; full_name:string; nickname:string|null; grade:string|null; student_id:string|null }
interface Quiz { id:string; title:string; pass_score:number }
interface Sub {
  id:string; quiz_id:string; student_id:string; score:number|null
  is_passed:boolean|null; submitted_at:string; time_taken:number|null
  answers:Record<string,string|number>
  student:Profile|null
  quiz:Quiz|null
}

// ─── Portal helper (หลีก backdrop-filter stacking context ของ Topbar) ─────────
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPortal } = require('react-dom') as typeof import('react-dom')
  return createPortal(children, document.body) as React.ReactElement
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ detail, onClose, onDelete, formatTime }: {
  detail: Sub
  onClose: () => void
  onDelete: (id: string) => void
  formatTime: (s: number|null) => string
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  return (
    <Portal>
      {/* Backdrop */}
      <div
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', zIndex:99998 }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        position:'fixed', zIndex:99999,
        top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:'calc(100% - 32px)', maxWidth:560, maxHeight:'90vh',
        display:'flex', flexDirection:'column',
        background:'var(--surface)', borderRadius:20,
        boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div>
            <h3 style={{ fontWeight:700, fontSize:15 }}>รายละเอียดการสอบ</h3>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{detail.student?.full_name} · {detail.quiz?.title}</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          {/* Score summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <div className="stat-card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:26, fontWeight:700, color: detail.is_passed ? 'var(--green)' : 'var(--red)' }}>
                {detail.score?.toFixed(0) ?? '-'}%
              </div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>คะแนน</div>
            </div>
            <div className="stat-card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700 }}>{formatTime(detail.time_taken)}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>เวลาที่ใช้</div>
            </div>
            <div className="stat-card" style={{ textAlign:'center' }}>
              <span className={`badge ${detail.is_passed ? 'badge-green' : 'badge-red'}`} style={{ fontSize:13, padding:'4px 10px' }}>
                {detail.is_passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
              </span>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>ผลการสอบ</div>
            </div>
          </div>

          {/* Student info */}
          <div style={{ background:'#FAFAFA', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>ข้อมูลนักเรียน</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:13 }}>
              <div><span style={{ color:'var(--text-3)' }}>ชื่อ: </span>{detail.student?.full_name}</div>
              <div><span style={{ color:'var(--text-3)' }}>ชื่อเล่น: </span>{detail.student?.nickname ?? '-'}</div>
              <div><span style={{ color:'var(--text-3)' }}>รหัส: </span>{detail.student?.student_id ?? '-'}</div>
              <div><span style={{ color:'var(--text-3)' }}>ชั้น: </span>{detail.student?.grade ?? '-'}</div>
            </div>
          </div>

          {/* Answers */}
          {detail.answers && Object.keys(detail.answers).length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                คำตอบที่ส่ง ({Object.keys(detail.answers).length} ข้อ)
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
                {Object.entries(detail.answers).map(([qid, ans], i) => (
                  <div key={qid} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:'#FAFAFA', borderRadius:8, border:'1px solid var(--border)' }}>
                    <span style={{ width:22, height:22, borderRadius:6, background:'var(--blue-light)', color:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                    <span style={{ fontSize:13, color:'var(--text-2)' }}>
                      {typeof ans === 'number' ? `ตัวเลือก ${String.fromCharCode(65+ans)}` : String(ans) || <em style={{ color:'var(--text-3)' }}>ไม่ได้ตอบ</em>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize:12, color:'var(--text-3)', textAlign:'right' }}>
            ส่งเมื่อ: {new Date(detail.submitted_at).toLocaleString('th-TH')}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(detail.id)}>
            <Trash2 size={12} /> ลบรายการนี้
          </button>
          <button className="btn" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </Portal>
  )
}

// ─── Grid.js Table ────────────────────────────────────────────────────────────
function GridTable({ data, onView, onDelete, formatTime }: {
  data: Sub[]
  onView: (s: Sub) => void
  onDelete: (id: string) => void
  formatTime: (s: number|null) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<any>(null)

  const buildGrid = useCallback(() => {
    if (!containerRef.current) return

    // ล้าง grid เก่า
    if (gridRef.current) {
      gridRef.current.destroy()
      gridRef.current = null
    }
    containerRef.current.innerHTML = ''

    const { Grid, html } = (window as any).gridjs as { Grid: any; html: any }

    gridRef.current = new Grid({
      columns: [
        {
          id: 'student',
          name: 'นักเรียน',
          sort: true,
          formatter: (_: unknown, row: any) => {
            const name  = row.cells[0].data as string
            const sub   = row.cells[7].data as string // raw json index
            return html(`
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:30px;height:30px;border-radius:8px;background:var(--blue-light,#EEF3FF);color:var(--blue,#0052FF);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">
                  ${name[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style="font-weight:600;font-size:13px">${name}</div>
                  <div style="font-size:11px;color:#94a3b8">${sub}</div>
                </div>
              </div>
            `)
          },
        },
        { id: 'quiz',  name: 'แบบทดสอบ', sort: true },
        {
          id: 'score',
          name: 'คะแนน',
          sort: true,
          formatter: (_: unknown, row: any) => {
            const score    = row.cells[2].data as number|null
            const isPassed = row.cells[3].data as boolean|null
            if (score === null) return html(`<span style="color:#94a3b8">-</span>`)
            const color = isPassed ? '#16a34a' : '#dc2626'
            const pct   = Math.round(score)
            return html(`
              <div style="display:flex;align-items:center;gap:7px">
                <div style="width:44px;height:5px;border-radius:99px;background:#e2e8f0;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${color};border-radius:99px"></div>
                </div>
                <span style="font-weight:700;font-size:13px;color:${color}">${pct}%</span>
              </div>
            `)
          },
        },
        {
          id: 'isPassed',
          name: 'ผล',
          sort: true,
          formatter: (cell: unknown) => {
            if (cell === null || cell === undefined) return html(`<span style="color:#94a3b8">-</span>`)
            const p = cell as boolean
            return html(`
              <span style="
                display:inline-flex;align-items:center;gap:3px;
                border-radius:99px;padding:3px 10px;font-size:12px;font-weight:700;
                background:${p ? '#f0fdf4' : '#fef2f2'};
                color:${p ? '#15803d' : '#dc2626'}
              ">${p ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}</span>
            `)
          },
        },
        {
          id: 'timeTaken',
          name: 'เวลา',
          sort: true,
          formatter: (cell: unknown) => {
            const t = cell as number|null
            return html(`<span style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:3px">🕐 ${formatTime(t)}</span>`)
          },
        },
        {
          id: 'submittedAt',
          name: 'วันที่ส่ง',
          sort: true,
          formatter: (cell: unknown) => {
            const dt  = new Date(cell as string)
            const d   = dt.toLocaleDateString('th-TH',{ day:'numeric', month:'short', year:'2-digit' })
            const tm  = dt.toLocaleTimeString('th-TH',{ hour:'2-digit', minute:'2-digit' })
            return html(`<div style="font-size:12px;color:#475569">${d}<br/><span style="font-size:10px;color:#94a3b8">${tm}</span></div>`)
          },
        },
        {
          id: 'actions',
          name: 'การดำเนินการ',
          sort: false,
          formatter: (_: unknown, row: any) => {
            const id = row.cells[6].data as string
            return html(`
              <div style="display:flex;gap:5px">
                <button
                  data-view="${id}"
                  style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:7px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#475569"
                >👁 ดู</button>
                <button
                  data-del="${id}"
                  style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:7px;border:1px solid #fecaca;background:#fef2f2;cursor:pointer;font-size:12px;font-weight:600;color:#dc2626"
                >🗑</button>
              </div>
            `)
          },
        },
        // hidden column: raw id + subtitle text for formatter
        { id: 'id',       name: 'id',       hidden: true },
        { id: 'subtitle', name: 'subtitle', hidden: true },
      ],
      data: data.map(s => [
        s.student?.full_name ?? '-',
        s.quiz?.title ?? '-',
        s.score,
        s.is_passed,
        s.time_taken,
        s.submitted_at,
        s.id,
        `${s.student?.nickname ? `(${s.student.nickname}) ` : ''}${s.student?.grade ?? ''}`,
      ]),
      search: {
        enabled: true,
        placeholder: 'ค้นหา...',
      },
      pagination: {
        enabled: true,
        limit: 15,
        summary: true,
      },
      sort: true,
      resizable: true,
      language: {
        search: { placeholder: 'ค้นหานักเรียน, แบบทดสอบ...' },
        pagination: {
          previous: '← ก่อนหน้า',
          next: 'ถัดไป →',
          showing: 'แสดง',
          results: () => 'รายการ',
          of: 'จาก',
          to: 'ถึง',
        },
        loading: 'กำลังโหลด...',
        noRecordsFound: 'ไม่พบข้อมูล',
        error: 'เกิดข้อผิดพลาด',
      },
      style: {
        table: { border: 'none', fontSize: '13px' },
        thead: { background: '#f8fafc', fontWeight: '700', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
        th: { padding: '10px 14px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
        td: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
      },
      className: {
        container: 'gridjs-custom-container',
        table: 'gridjs-custom-table',
        thead: 'gridjs-custom-thead',
        tbody: 'gridjs-custom-tbody',
        footer: 'gridjs-custom-footer',
        search: 'gridjs-custom-search',
        pagination: 'gridjs-custom-pagination',
      },
    })

    gridRef.current.render(containerRef.current)

    // delegate click events หลังจาก render เสร็จ
    const el = containerRef.current
    const clickHandler = (e: Event) => {
      const target = e.target as HTMLElement
      const btn = target.closest('button') as HTMLButtonElement | null
      if (!btn) return
      const viewId = btn.dataset.view
      const delId  = btn.dataset.del
      if (viewId) {
        const sub = data.find(s => s.id === viewId)
        if (sub) onView(sub)
      }
      if (delId) {
        onDelete(delId)
      }
    }
    el.addEventListener('click', clickHandler)
    return () => el.removeEventListener('click', clickHandler)
  }, [data, onView, onDelete, formatTime])

  // โหลด Grid.js CSS + JS จาก CDN แล้ว render
  useEffect(() => {
    // inject CSS ถ้ายังไม่มี
    if (!document.getElementById('gridjs-css')) {
      const link = document.createElement('link')
      link.id   = 'gridjs-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/gridjs/dist/theme/mermaid.min.css'
      document.head.appendChild(link)
    }

    // inject JS ถ้ายังไม่มี
    const existingScript = document.getElementById('gridjs-script')
    if (existingScript) {
      buildGrid()
      return
    }
    const script = document.createElement('script')
    script.id  = 'gridjs-script'
    script.src = 'https://unpkg.com/gridjs/dist/gridjs.umd.js'
    script.onload = () => buildGrid()
    document.head.appendChild(script)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // อัปเดต grid เมื่อ data เปลี่ยน
  useEffect(() => {
    if (!(window as any).gridjs) return
    buildGrid()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return (
    <>
      <style>{`
        .gridjs-custom-container { font-family: inherit; }
        .gridjs-wrapper { border-radius: 12px; border: 1px solid #e2e8f0 !important; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .gridjs-head { padding: 12px 14px 0; background: white; }
        .gridjs-search input {
          border: 1px solid #e2e8f0 !important; border-radius: 8px !important;
          padding: 7px 12px !important; font-size: 13px !important;
          outline: none !important; width: 220px !important;
        }
        .gridjs-search input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important; }
        .gridjs-footer { padding: 10px 14px !important; background: #f8fafc !important; border-top: 1px solid #e2e8f0 !important; }
        .gridjs-pagination { font-size: 12px !important; }
        .gridjs-pagination .gridjs-pages button {
          border-radius: 7px !important; border: 1px solid #e2e8f0 !important;
          min-width: 30px !important; height: 30px !important; font-size: 12px !important; font-weight: 600 !important;
        }
        .gridjs-pagination .gridjs-pages button.gridjs-currentPage { background: #0052FF !important; color: white !important; border-color: #0052FF !important; }
        .gridjs-tr:hover td { background: #f8fafc !important; }
        .gridjs-th-sort .gridjs-th-sort-neutral { opacity: 0.3 !important; }
      `}</style>
      <div ref={containerRef} />
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminSubmissionsClient({ submissions: init, quizzes }: { submissions:Sub[]; quizzes:Quiz[] }) {
  const [submissions, setSubmissions] = useState(init)
  const [selectedQuiz,  setSelectedQuiz]  = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [detail,        setDetail]        = useState<Sub|null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const supabase = createClient()

  const grades = useMemo(() => {
    const g = new Set(submissions.map(s => s.student?.grade).filter(Boolean) as string[])
    return ['all', ...Array.from(g).sort()]
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      const matchQuiz  = selectedQuiz  === 'all' || s.quiz_id === selectedQuiz
      const matchGrade = selectedGrade === 'all' || s.student?.grade === selectedGrade
      return matchQuiz && matchGrade
    })
  }, [submissions, selectedQuiz, selectedGrade])

  const stats = useMemo(() => {
    const f = filtered
    if (!f.length) return null
    const scored = f.filter(s => s.score !== null)
    const avg = scored.length ? Math.round(scored.reduce((a,s) => a+(s.score??0),0)/scored.length) : 0
    const passed = f.filter(s => s.is_passed).length
    return { total: f.length, avg, passed, failed: f.length - passed }
  }, [filtered])

  async function deleteSelected() {
    if (!selected.size) return
    if (!confirm(`ยืนยันการลบ ${selected.size} รายการ?`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from('submissions').delete().in('id', ids)
    if (error) { toast.error('ลบไม่สำเร็จ'); setDeleting(false); return }
    setSubmissions(p => p.filter(s => !ids.includes(s.id)))
    setSelected(new Set())
    toast.success(`ลบ ${ids.length} รายการแล้ว ✓`)
    setDeleting(false)
  }

  async function deleteSingle(id: string) {
    if (!confirm('ยืนยันการลบ?')) return
    await supabase.from('submissions').delete().eq('id', id)
    setSubmissions(p => p.filter(s => s.id !== id))
    if (detail?.id === id) setDetail(null)
    toast.success('ลบแล้ว ✓')
  }

  function formatTime(sec: number|null) {
    if (!sec) return '-'
    const m = Math.floor(sec/60), s = sec%60
    return `${m}:${String(s).padStart(2,'0')}`
  }

  const handleView = useCallback((s: Sub) => setDetail(s), [])

  return (
    <div style={{ maxWidth:1040, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10 }}>
          {[
            { label:'รายการทั้งหมด', value:stats.total,       color:'var(--blue)',   bg:'var(--blue-light)' },
            { label:'คะแนนเฉลี่ย',   value:`${stats.avg}%`,  color:'var(--purple)', bg:'var(--purple-light)' },
            { label:'ผ่าน',          value:stats.passed,      color:'var(--green)',  bg:'var(--green-light)' },
            { label:'ไม่ผ่าน',       value:stats.failed,      color:'var(--red)',    bg:'var(--red-light)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign:'center', background:s.bg, border:`1px solid ${s.color}22` }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:s.color, marginTop:2, opacity:0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <select className="input" style={{ width:220 }} value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
          <option value="all">ทุกแบบทดสอบ</option>
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
        <select className="input" style={{ width:130 }} value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
          {grades.map(g => <option key={g} value={g}>{g === 'all' ? 'ทุกชั้น' : g}</option>)}
        </select>
        {selected.size > 0 && (
          <button className="btn btn-danger" onClick={deleteSelected} disabled={deleting}>
            <Trash2 size={13} /> ลบที่เลือก ({selected.size})
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)' }}>
          แสดง {filtered.length} จาก {submissions.length} รายการ
        </span>
      </div>

      {/* Grid.js Table */}
      <div className="card" style={{ padding:12, overflow:'hidden' }}>
        <GridTable
          data={filtered}
          onView={handleView}
          onDelete={deleteSingle}
          formatTime={formatTime}
        />
      </div>

      {/* Detail Modal */}
      {detail && (
        <DetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          onDelete={(id) => { deleteSingle(id); setDetail(null) }}
          formatTime={formatTime}
        />
      )}
    </div>
  )
}