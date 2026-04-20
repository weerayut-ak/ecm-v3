'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Trash2, ChevronDown, ChevronUp, Eye, Filter, Download, X, CheckCircle, XCircle, Clock, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Profile { id:string; full_name:string; nickname:string|null; grade:string|null; student_id:string|null }
interface Quiz { id:string; title:string; pass_score:number }
interface Sub {
  id:string; quiz_id:string; student_id:string; score:number|null
  is_passed:boolean|null; submitted_at:string; time_taken:number|null
  answers:Record<string,string|number>
  student:Profile|null
  quiz:Quiz|null
}

export default function AdminSubmissionsClient({ submissions: init, quizzes }: { submissions:Sub[]; quizzes:Quiz[] }) {
  const [submissions, setSubmissions] = useState(init)
  const [selectedQuiz, setSelectedQuiz] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Sub|null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const grades = useMemo(() => {
    const g = new Set(submissions.map(s => s.student?.grade).filter(Boolean) as string[])
    return ['all', ...Array.from(g).sort()]
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      const matchQuiz  = selectedQuiz  === 'all' || s.quiz_id === selectedQuiz
      const matchGrade = selectedGrade === 'all' || s.student?.grade === selectedGrade
      const q = search.toLowerCase()
      const matchSearch = !q ||
        s.student?.full_name.toLowerCase().includes(q) ||
        (s.student?.nickname ?? '').toLowerCase().includes(q) ||
        (s.student?.student_id ?? '').toLowerCase().includes(q)
      return matchQuiz && matchGrade && matchSearch
    })
  }, [submissions, selectedQuiz, selectedGrade, search])

  // Stats
  const stats = useMemo(() => {
    const f = filtered
    if (!f.length) return null
    const scored = f.filter(s => s.score !== null)
    const avg = scored.length ? Math.round(scored.reduce((a,s) => a+(s.score??0),0)/scored.length) : 0
    const passed = f.filter(s => s.is_passed).length
    return { total: f.length, avg, passed, failed: f.length - passed }
  }, [filtered])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

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

  return (
    <div style={{ maxWidth:1040, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>

      {/* Stats row */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10 }}>
          {[
            { label:'รายการทั้งหมด', value:stats.total, color:'var(--blue)', bg:'var(--blue-light)' },
            { label:'คะแนนเฉลี่ย',   value:`${stats.avg}%`, color:'var(--purple)', bg:'var(--purple-light)' },
            { label:'ผ่าน',          value:stats.passed, color:'var(--green)', bg:'var(--green-light)' },
            { label:'ไม่ผ่าน',       value:stats.failed, color:'var(--red)', bg:'var(--red-light)' },
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
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft:30 }} placeholder="ค้นหานักเรียน..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width:200 }} value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
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
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width:40 }}>
                  <input type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll} />
                </th>
                <th>นักเรียน</th>
                <th>แบบทดสอบ</th>
                <th>คะแนน</th>
                <th>ผล</th>
                <th>เวลาที่ใช้</th>
                <th>วันที่ส่ง</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>ไม่พบข้อมูล</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} style={{ background: selected.has(s.id) ? 'var(--blue-light)' : '' }}>
                  <td>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:'var(--blue-light)', color:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                        {s.student?.full_name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{s.student?.full_name ?? '-'}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>
                          {s.student?.nickname ? `(${s.student.nickname}) ` : ''}{s.student?.grade ?? ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize:13, maxWidth:160 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.quiz?.title ?? '-'}</div>
                  </td>
                  <td>
                    {s.score !== null ? (
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div className="progress" style={{ width:50 }}>
                          <div className="progress-fill" style={{ width:`${s.score}%`, background: s.is_passed ? 'var(--green)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontWeight:700, fontSize:13, color: s.is_passed ? 'var(--green)' : 'var(--red)' }}>
                          {s.score.toFixed(0)}%
                        </span>
                      </div>
                    ) : <span style={{ color:'var(--text-3)' }}>-</span>}
                  </td>
                  <td>
                    <span className={`badge ${s.is_passed ? 'badge-green' : s.is_passed === false ? 'badge-red' : 'badge-gray'}`}>
                      {s.is_passed ? '✓ ผ่าน' : s.is_passed === false ? '✗ ไม่ผ่าน' : '-'}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <Clock size={11} />{formatTime(s.time_taken)}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-3)' }}>
                    {new Date(s.submitted_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })}
                    <div style={{ fontSize:10 }}>
                      {new Date(s.submitted_at).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-sm" onClick={() => setDetail(s)} title="ดูรายละเอียด">
                        <Eye size={12} /> ดู
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteSingle(s.id)} title="ลบ">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)', display:'flex', justifyContent:'space-between' }}>
          <span>แสดง {filtered.length} จาก {submissions.length} รายการ</span>
          {selected.size > 0 && <span style={{ color:'var(--blue)', fontWeight:600 }}>เลือกแล้ว {selected.size} รายการ</span>}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }}
          onClick={e => e.target===e.currentTarget && setDetail(null)}>
          <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', borderBottom:'1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontWeight:700, fontSize:15 }}>รายละเอียดการสอบ</h3>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{detail.student?.full_name} · {detail.quiz?.title}</p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setDetail(null)}><X size={16}/></button>
            </div>
            <div style={{ padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
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
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>คำตอบที่ส่ง ({Object.keys(detail.answers).length} ข้อ)</div>
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
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
              <button className="btn btn-danger btn-sm" onClick={() => deleteSingle(detail.id)}>
                <Trash2 size={12} /> ลบรายการนี้
              </button>
              <button className="btn" onClick={() => setDetail(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
