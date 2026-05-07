'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Trash2, Edit2, TrendingUp, Eye, KeyRound, Upload, Download, TableProperties, LayoutList, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'

const GRADES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3']
const GRADE_LEVELS = ['ม.1','ม.2','ม.3']

interface Profile { id:string; full_name:string; nickname:string|null; grade:string|null; student_id:string|null; role:string; avatar_url:string|null; email?:string|null }
interface StudentWithScores extends Profile { avg_score?: number; quiz_count?: number }

interface ImportRow {
  full_name: string
  nickname?: string
  student_id?: string
  grade: string
  email: string
  password: string
  _status?: 'valid' | 'error'
  _errors?: string[]
  _rowIndex?: number
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const data = [
    ['ชื่อ-สกุล *', 'ชื่อเล่น', 'รหัสนักเรียน', 'ระดับชั้น *', 'Email *', 'รหัสผ่าน *'],
    ['full_name', 'nickname', 'student_id', 'grade', 'email', 'password'],
    ['นายสมชาย ใจดี', 'ชาย', '12345', 'ม.1/1', 'somchai@school.ac.th', 'pass123'],
    ['นางสาวสมหญิง รักเรียน', 'หญิง', '12346', 'ม.2/3', 'somying@school.ac.th', 'pass456'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [28,16,16,12,28,16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'นักเรียน')
  XLSX.writeFile(wb, 'student_import_template.xlsx')
}

function validateRow(row: ImportRow, index: number): ImportRow {
  const errors: string[] = []
  if (!row.full_name?.trim()) errors.push('ต้องกรอกชื่อ-สกุล')
  if (!row.email?.trim()) errors.push('ต้องกรอก Email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('รูปแบบ Email ไม่ถูกต้อง')
  if (!row.password?.trim()) errors.push('ต้องกรอกรหัสผ่าน')
  else if (String(row.password).length < 6) errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  if (!row.grade?.trim()) errors.push('ต้องเลือกระดับชั้น')
  else if (!GRADES.includes(row.grade.trim())) errors.push(`ระดับชั้น "${row.grade}" ไม่ถูกต้อง`)
  return { ...row, _status: errors.length ? 'error' : 'valid', _errors: errors, _rowIndex: index }
}

async function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
        const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as string[][]
        let startRow = 0
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i].map(c => String(c).toLowerCase().trim())
          if (row.includes('full_name') || row.includes('ชื่อ-สกุล *') || row.includes('ชื่อ-สกุล')) {
            startRow = i + 1
            if (rows[startRow] && rows[startRow].map(c => String(c)).includes('full_name')) startRow++
            break
          }
        }
        const result: ImportRow[] = []
        for (let i = startRow; i < rows.length; i++) {
          const r = rows[i]
          if (!r || r.every(c => !String(c).trim())) continue
          result.push(validateRow({
            full_name: String(r[0] ?? '').trim(),
            nickname: String(r[1] ?? '').trim() || undefined,
            student_id: String(r[2] ?? '').trim() || undefined,
            grade: String(r[3] ?? '').trim(),
            email: String(r[4] ?? '').trim(),
            password: String(r[5] ?? '').trim(),
          }, i + 1))
        }
        resolve(result)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export default function StudentsClient({ students: init }: { students: StudentWithScores[] }) {
  const router = useRouter()
  const [students, setStudents] = useState(init)
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [modal, setModal] = useState<{ mode: 'view'|'edit'|'add'|'password'|'import'; student?: StudentWithScores } | null>(null)
  const [saving, setSaving] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = students.filter(s => {
    const matchGrade = grade === 'all' || s.grade?.startsWith(grade)
    const q = search.toLowerCase()
    return matchGrade && (!q || s.full_name.toLowerCase().includes(q) || (s.nickname??'').toLowerCase().includes(q) || (s.student_id??'').toLowerCase().includes(q))
  })

  const gradeStats = GRADE_LEVELS.map(g => ({
    grade: g, count: students.filter(s => s.grade?.startsWith(g)).length,
  }))

  async function handleDelete(id: string) {
    if (!confirm('ยืนยันการลบนักเรียนคนนี้?')) return
    await supabase.from('profiles').delete().eq('id', id)
    setStudents(p => p.filter(s => s.id !== id))
    toast.success('ลบแล้ว')
  }

  async function handleSave(form: Partial<Profile>, email?: string, password?: string) {
    setSaving(true)
    if (modal?.mode === 'add') {
      if (!email || !password) { toast.error('กรุณากรอก Email และรหัสผ่าน'); setSaving(false); return }
      const res = await fetch('/api/admin/create-student', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email, password })
      })
      const json = await res.json()
      if (!res.ok) { toast.error('เกิดข้อผิดพลาด: ' + json.error); setSaving(false); return }
      toast.success(`สร้างบัญชีสำเร็จ!\nEmail: ${email}`, { duration: 6000 })
      setStudents(p => [...p, { ...form, id: json.user.id, role: 'student', email } as StudentWithScores])
      setModal(null)
    } else if (modal?.mode === 'edit' && modal.student) {
      const { error } = await supabase.from('profiles').update(form).eq('id', modal.student.id)
      if (error) { toast.error('บันทึกไม่สำเร็จ'); setSaving(false); return }
      setStudents(p => p.map(s => s.id === modal.student!.id ? { ...s, ...form } : s))
      toast.success('บันทึกแล้ว ✓')
      setModal(null)
    }
    setSaving(false)
  }

  async function handleChangePassword(userId: string, newPassword: string) {
    setSaving(true)
    const res = await fetch('/api/admin/update-student', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, password: newPassword })
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + json.error); return }
    toast.success('เปลี่ยนรหัสผ่านสำเร็จ ✓')
    setModal(null)
  }

  async function handleImportConfirm(rows: ImportRow[]) {
    setSaving(true)
    let success = 0, failed = 0
    for (const row of rows) {
      if (row._status !== 'valid') { failed++; continue }
      try {
        const res = await fetch('/api/admin/create-student', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: row.full_name, nickname: row.nickname, student_id: row.student_id, grade: row.grade, email: row.email, password: row.password })
        })
        if (res.ok) {
          const json = await res.json()
          setStudents(p => [...p, { full_name: row.full_name, nickname: row.nickname ?? null, student_id: row.student_id ?? null, grade: row.grade, id: json.user.id, role: 'student', email: row.email, avatar_url: null }])
          success++
        } else { failed++ }
      } catch { failed++ }
    }
    setSaving(false)
    setModal(null)
    toast.success(`นำเข้าสำเร็จ ${success} คน${failed ? ` (ไม่สำเร็จ ${failed} คน)` : ''}`, { duration: 5000 })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseFile(file)
      if (rows.length === 0) { toast.error('ไม่พบข้อมูลในไฟล์'); return }
      setImportRows(rows)
      setModal({ mode: 'import' })
    } catch { toast.error('ไม่สามารถอ่านไฟล์ได้') }
    e.target.value = ''
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{students.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>นักเรียนทั้งหมด</div>
        </div>
        {gradeStats.map(g => (
          <div key={g.grade} className="stat-card"
            style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', border: grade === g.grade ? '1.5px solid var(--blue)' : '1px solid var(--border)' }}
            onClick={() => setGrade(grade === g.grade ? 'all' : g.grade)}>
            <div style={{ fontSize: 22, fontWeight: 700, color: grade === g.grade ? 'var(--blue)' : 'var(--text)' }}>{g.count}</div>
            <div style={{ fontSize: 11, color: grade === g.grade ? 'var(--blue)' : 'var(--text-3)', marginTop: 2, fontWeight: grade === g.grade ? 600 : 400 }}>{g.grade}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัส..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 140 }} value={grade} onChange={e => setGrade(e.target.value)}>
          <option value="all">ทุกระดับชั้น</option>
          {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <button className="btn btn-sm" onClick={() => setViewMode('list')}
            style={{ borderRadius: 0, background: viewMode === 'list' ? 'var(--blue-light)' : 'transparent', color: viewMode === 'list' ? 'var(--blue)' : 'var(--text-2)', border: 'none' }}>
            <LayoutList size={13} />
          </button>
          <button className="btn btn-sm" onClick={() => setViewMode('table')}
            style={{ borderRadius: 0, background: viewMode === 'table' ? 'var(--blue-light)' : 'transparent', color: viewMode === 'table' ? 'var(--blue)' : 'var(--text-2)', border: 'none' }}>
            <TableProperties size={13} />
          </button>
        </div>

        <button className="btn btn-sm" onClick={downloadTemplate} style={{ gap: 5, color: 'var(--text-2)' }}>
          <FileSpreadsheet size={13} /> ดาวน์โหลดแม่แบบ
        </button>
        <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()} style={{ gap: 5, color: 'var(--text-2)' }}>
          <Upload size={13} /> นำเข้า Excel
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Add buttons */}
        <div style={{ display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--blue)' }}>
          <button className="btn btn-primary" style={{ borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.25)' }}
            onClick={() => setModal({ mode: 'add' })}>
            <Plus size={14} /> เพิ่มนักเรียน
          </button>
          <button className="btn btn-primary" title="เพิ่มหลายคน / นำเข้า Excel"
            style={{ borderRadius: 0, padding: '0 10px' }}
            onClick={() => router.push('/dashboard/students/add')}>
            <TableProperties size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>รหัส</th>
                <th>ระดับชั้น</th>
                {viewMode === 'table' && <th>Email</th>}
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={viewMode === 'table' ? 5 : 4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>ไม่พบนักเรียน</td></tr>
              )}
              {filtered.map(s => {
                const initial = s.full_name[0]?.toUpperCase() ?? '?'
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                          {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name}</div>
                          {s.nickname && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>({s.nickname})</div>}
                          {viewMode !== 'table' && s.email && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F3F4F6', padding: '2px 7px', borderRadius: 6 }}>{s.student_id ?? '-'}</span></td>
                    <td>{s.grade ? <span className="badge badge-blue">{s.grade}</span> : <span style={{ color: 'var(--text-3)' }}>-</span>}</td>
                    {viewMode === 'table' && <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.email ?? '-'}</td>}
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setModal({ mode: 'view', student: s })}><Eye size={12} /> ดู</button>
                        <button className="btn btn-sm" onClick={() => setModal({ mode: 'edit', student: s })}><Edit2 size={12} /> แก้ไข</button>
                        <button className="btn btn-sm" onClick={() => setModal({ mode: 'password', student: s })}><KeyRound size={12} /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>แสดง {filtered.length} จาก {students.length} คน</span>
          <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Download size={11} /> ดาวน์โหลดแม่แบบ Excel
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal && createPortal(
        modal.mode === 'password' && modal.student
          ? <PasswordModal student={modal.student} onClose={() => setModal(null)} onSave={handleChangePassword} saving={saving} />
          : modal.mode === 'import'
          ? <ImportPreviewModal rows={importRows} onClose={() => setModal(null)} onConfirm={handleImportConfirm} saving={saving} />
          : <StudentModal mode={modal.mode as 'view'|'edit'|'add'} student={modal.student} onClose={() => setModal(null)} onSave={handleSave} saving={saving} />,
        document.body
      )}
    </div>
  )
}

// ─── Import Preview Modal ──────────────────────────────────────────────────────
function ImportPreviewModal({ rows, onClose, onConfirm, saving }: {
  rows: ImportRow[]; onClose: () => void
  onConfirm: (rows: ImportRow[]) => void; saving: boolean
}) {
  const validCount = rows.filter(r => r._status === 'valid').length
  const errorCount = rows.filter(r => r._status === 'error').length
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 820, width: '95vw' }}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>พรีวิวข้อมูลก่อนนำเข้า</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DCFCE7', color: '#166534', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle2 size={14} /> ถูกต้อง {validCount} รายการ
            </div>
            {errorCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                <AlertCircle size={14} /> พบข้อผิดพลาด {errorCount} รายการ (จะข้ามรายการนี้)
              </div>
            )}
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                <tr>
                  {['#','ชื่อ-สกุล','ชื่อเล่น','รหัส','ระดับชั้น','Email','รหัสผ่าน','สถานะ'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ background: row._status === 'error' ? '#FFF5F5' : i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{row._rowIndex ?? i}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 500 }}>{row.full_name || <span style={{ color: '#EF4444' }}>-ว่าง-</span>}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-2)' }}>{row.nickname ?? '-'}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>{row.student_id ?? '-'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.grade ? <span className="badge badge-blue">{row.grade}</span> : <span style={{ color: '#EF4444' }}>-</span>}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.email || <span style={{ color: '#EF4444' }}>-ว่าง-</span>}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: 'var(--text-3)' }}>{'•'.repeat(Math.min(row.password?.length ?? 0, 8))}</td>
                    <td style={{ padding: '7px 10px' }}>
                      {row._status === 'valid'
                        ? <span style={{ color: '#16A34A', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={11} /> ตกลง</span>
                        : <div>
                            <span style={{ color: '#DC2626', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}><AlertCircle size={11} /> ข้อผิดพลาด</span>
                            {row._errors?.map((e, ei) => <div key={ei} style={{ fontSize: 10, color: '#DC2626' }}>• {e}</div>)}
                          </div>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={() => onConfirm(rows.filter(r => r._status === 'valid'))} disabled={saving || validCount === 0}>
            {saving ? <><div className="spinner" />กำลังนำเข้า...</> : `นำเข้า ${validCount} รายการ`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Password Modal ────────────────────────────────────────────────────────────
function PasswordModal({ student, onClose, onSave, saving }: {
  student: StudentWithScores; onClose: () => void
  onSave: (userId: string, password: string) => void; saving: boolean
}) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(true)
  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>เปลี่ยนรหัสผ่าน</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>นักเรียน: <strong>{student.full_name}</strong></p>
          {student.email && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Email: {student.email}</p>}
          <div>
            <label className="form-label">รหัสผ่านใหม่</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={show ? 'text' : 'password'} placeholder="รหัสผ่านใหม่" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 80 }} />
              <button className="btn btn-sm btn-ghost" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 11 }} onClick={() => setShow(p => !p)}>
                {show ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>
          <div style={{ background: 'var(--blue-light)', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 12, color: 'var(--blue)' }}>
            💡 แจ้งรหัสผ่านนี้ให้นักเรียนนำไปใช้เข้าสู่ระบบ
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={() => onSave(student.id, password)} disabled={saving || !password}>
            {saving ? <><div className="spinner" />บันทึก...</> : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Student Modal (view / edit / add) ────────────────────────────────────────
function StudentModal({ mode, student, onClose, onSave, saving }: {
  mode: 'view'|'edit'|'add'; student?: StudentWithScores
  onClose: () => void; onSave: (f: Partial<Profile>, email?: string, password?: string) => void; saving: boolean
}) {
  const [form, setForm] = useState<Partial<Profile>>(student ?? {})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const set = (k: keyof Profile, v: string) => setForm(p => ({ ...p, [k]: v }))

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>{mode === 'view' ? 'ข้อมูลนักเรียน' : mode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มนักเรียน'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {mode === 'view' && student ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, margin: '0 auto 12px', overflow: 'hidden' }}>
                  {student.avatar_url ? <img src={student.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : student.full_name[0]}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{student.full_name}</h2>
                {student.nickname && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>({student.nickname})</p>}
                {student.grade && <span className="badge badge-blue" style={{ marginTop: 6, display: 'inline-flex' }}>{student.grade}</span>}
                {student.email && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{student.email}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="stat-card"><div style={{ fontSize: 11, color: 'var(--text-3)' }}>รหัสนักเรียน</div><div style={{ fontWeight: 700, marginTop: 4 }}>{student.student_id ?? '-'}</div></div>
                <div className="stat-card"><div style={{ fontSize: 11, color: 'var(--text-3)' }}>ระดับชั้น</div><div style={{ fontWeight: 700, marginTop: 4 }}>{student.grade ?? '-'}</div></div>
              </div>
              {student.avg_score !== undefined && (
                <div className="stat-card" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrendingUp size={18} color="var(--blue)" />
                  <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>คะแนนเฉลี่ย</div><div style={{ fontWeight: 700, fontSize: 18 }}>{student.avg_score?.toFixed(0)}%</div></div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="form-label">ชื่อ-สกุล *</label><input className="input" value={form.full_name??''} onChange={e => set('full_name', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">ชื่อเล่น</label><input className="input" value={form.nickname??''} onChange={e => set('nickname', e.target.value)} /></div>
                <div><label className="form-label">รหัสนักเรียน</label><input className="input" value={form.student_id??''} onChange={e => set('student_id', e.target.value)} /></div>
              </div>
              <div>
                <label className="form-label">ระดับชั้น</label>
                <select className="input" value={form.grade??''} onChange={e => set('grade', e.target.value)}>
                  <option value="">เลือกระดับชั้น</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {mode === 'add' && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>ข้อมูลสำหรับเข้าสู่ระบบ</p>
                  <div><label className="form-label">Email *</label><input className="input" type="email" placeholder="student@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <div><label className="form-label">รหัสผ่าน *</label><input className="input" type="text" placeholder="รหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)} /></div>
                </>
              )}
            </div>
          )}
        </div>
        {mode !== 'view' && (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={() => onSave(form, email, password)} disabled={saving}>
              {saving ? <><div className="spinner" />บันทึก...</> : 'บันทึก'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}