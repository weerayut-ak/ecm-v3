'use client'
import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const GRADES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3']

interface ImportRow {
  full_name: string
  nickname: string
  student_id: string
  grade: string
  email: string
  password: string
  _status?: 'valid' | 'error' | 'idle'
  _errors?: string[]
}

const emptyRow = (): ImportRow => ({
  full_name: '', nickname: '', student_id: '', grade: '', email: '', password: '', _status: 'idle', _errors: []
})

function validateRow(row: ImportRow): ImportRow {
  const errors: string[] = []
  if (!row.full_name.trim()) errors.push('ต้องกรอกชื่อ-สกุล')
  if (!row.email.trim()) errors.push('ต้องกรอก Email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email ไม่ถูกต้อง')
  if (!row.password.trim()) errors.push('ต้องกรอกรหัสผ่าน')
  else if (row.password.length < 6) errors.push('รหัสผ่าน ≥ 6 ตัวอักษร')
  if (!row.grade.trim()) errors.push('ต้องเลือกระดับชั้น')
  else if (!GRADES.includes(row.grade)) errors.push('ระดับชั้นไม่ถูกต้อง')
  return { ...row, _status: errors.length ? 'error' : 'valid', _errors: errors }
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const data = [
    ['ชื่อ-สกุล *', 'ชื่อเล่น', 'รหัสนักเรียน', 'ระดับชั้น *', 'Email *', 'รหัสผ่าน *'],
    ['full_name',   'nickname', 'student_id',   'grade',       'email',   'password'],
    ['นายสมชาย ใจดี', 'ชาย', '12345', 'ม.1/1', 'somchai@school.ac.th', 'pass123'],
    ['นางสาวสมหญิง รักเรียน', 'หญิง', '12346', 'ม.2/3', 'somying@school.ac.th', 'pass456'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [28,16,16,12,28,16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'นักเรียน')
  XLSX.writeFile(wb, 'student_import_template.xlsx')
}

async function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
        const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as string[][]
        let start = 0
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const r = rows[i].map(c => String(c).toLowerCase())
          if (r.includes('full_name') || r.some(c => c.includes('ชื่อ-สกุล'))) { start = i + 1; break }
        }
        if (rows[start]?.map(c => String(c)).includes('full_name')) start++
        const result = rows.slice(start)
          .filter(r => r.some(c => String(c).trim()))
          .map(r => validateRow({
            full_name: String(r[0]??'').trim(), nickname: String(r[1]??'').trim(),
            student_id: String(r[2]??'').trim(), grade: String(r[3]??'').trim(),
            email: String(r[4]??'').trim(), password: String(r[5]??'').trim(),
          }))
        resolve(result)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

type Mode = 'table' | 'preview'

const cols = [
  { key: 'full_name'  as const, label: 'ชื่อ-สกุล',   required: true,  w: 220, type: 'text'   },
  { key: 'nickname'   as const, label: 'ชื่อเล่น',      required: false, w: 100, type: 'text'   },
  { key: 'student_id' as const, label: 'รหัสนักเรียน', required: false, w: 120, type: 'text'   },
  { key: 'grade'      as const, label: 'ระดับชั้น',    required: true,  w: 100, type: 'select' },
  { key: 'email'      as const, label: 'Email',        required: true,  w: 220, type: 'email'  },
  { key: 'password'   as const, label: 'รหัสผ่าน',      required: true,  w: 140, type: 'text'   },
]

export default function AddStudentsClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()])
  const [mode, setMode] = useState<Mode>('table')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const validCount = rows.filter(r => r._status === 'valid').length
  const errorCount = rows.filter(r => r._status === 'error').length
  const hasValidated = rows.some(r => r._status !== 'idle')

  function updateRow(i: number, key: keyof ImportRow, val: string) {
    setRows(p => {
      const newRows = [...p]
      newRows[i] = { ...newRows[i], [key]: val, _status: 'idle', _errors: [] }
      // Auto add row if typing in the last row
      if (i === p.length - 1 && val.trim() !== '') {
        newRows.push(emptyRow())
      }
      return newRows
    })
  }

  function addRow() { setRows(p => [...p, emptyRow()]) }
  function removeRow(i: number) { setRows(p => p.length === 1 ? [emptyRow()] : p.filter((_, idx) => idx !== i)) }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) {
    let nextRow = rowIndex
    let nextCol = colIndex

    const isSelect = (e.target as HTMLElement).tagName === 'SELECT'
    if (isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return

    if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1)
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      nextRow = rowIndex + 1
      if (nextRow === rows.length) addRow()
    }
    if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      nextCol = Math.max(0, colIndex - 1)
    }
    if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value.length) {
      nextCol = Math.min(cols.length - 1, colIndex + 1)
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      e.preventDefault()
      setTimeout(() => {
        const el = document.getElementById(`cell-${nextRow}-${nextCol}`)
        if (el) el.focus()
      }, 0)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement | HTMLSelectElement>, startRow: number, startCol: number) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    if (!text) return

    const pastedData = text.split(/\r?\n/).map(row => row.split('\t'))
    
    setRows(prev => {
      const newRows = [...prev]
      pastedData.forEach((rowData, rOffset) => {
        const targetRow = startRow + rOffset
        if (!rowData.some(cell => cell.trim() !== '')) return

        if (targetRow >= newRows.length) newRows.push(emptyRow())

        rowData.forEach((cellData, cOffset) => {
          const targetCol = startCol + cOffset
          if (targetCol < cols.length) {
            newRows[targetRow] = {
              ...newRows[targetRow],
              [cols[targetCol].key]: cellData.trim(),
              _status: 'idle',
              _errors: []
            }
          }
        })
      })
      return newRows
    })
  }

  function handlePreview() {
    const cleanedRows = rows.filter(r => r.full_name || r.email || r.student_id)
    if(cleanedRows.length === 0) {
      toast.error('กรุณากรอกข้อมูลอย่างน้อย 1 รายการ')
      return
    }
    setRows(cleanedRows.map(validateRow))
    setMode('preview')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseExcel(file)
      if (!parsed.length) { toast.error('ไม่พบข้อมูลในไฟล์'); return }
      setRows(parsed)
      setMode('preview')
      toast.success(`โหลด ${parsed.length} รายการสำเร็จ`)
    } catch { toast.error('ไม่สามารถอ่านไฟล์ได้') }
    e.target.value = ''
  }

  async function handleSave() {
    const toSave = rows.filter(r => r._status === 'valid')
    if (!toSave.length) return
    setSaving(true)
    setProgress({ done: 0, total: toSave.length })
    let ok = 0, fail = 0
    for (let i = 0; i < toSave.length; i++) {
      try {
        const res = await fetch('/api/admin/create-student', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSave[i])
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
      setProgress({ done: i + 1, total: toSave.length })
    }
    setSaving(false)
    setProgress(null)
    toast.success(`เพิ่มนักเรียนสำเร็จ ${ok} คน${fail ? ` (ไม่สำเร็จ ${fail} คน)` : ''}`, { duration: 5000 })
    if (ok > 0) router.push('/dashboard/students')
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      <style dangerouslySetInnerHTML={{__html: `
        .sheet-table { border-collapse: collapse; width: 100%; background: #fff; }
        .sheet-th { 
          position: sticky; top: 0; z-index: 10;
          background: #f8fafc; border: 1px solid #cbd5e1;
          padding: 6px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #475569;
          user-select: none;
        }
        .sheet-td { 
          border: 1px solid #cbd5e1; padding: 0; position: relative; 
          background: inherit;
        }
        .sheet-td-fixed {
          position: sticky; left: 0; z-index: 5;
          background: #f8fafc; text-align: center; color: #94a3b8; font-size: 11px;
          user-select: none; border-right: 2px solid #cbd5e1;
        }
        .sheet-input {
          width: 100%; height: 32px; border: none; outline: none; padding: 0 10px;
          font-size: 13px; background: transparent; transition: all 0.1s;
        }
        .sheet-input:focus {
          box-shadow: inset 0 0 0 2px #2563eb; background: #fff; z-index: 2; position: relative;
        }
        .sheet-input:hover:not(:focus) { background: #f1f5f9; cursor: cell; }
        .error-cell { background: #fee2e2 !important; }
        .error-cell:focus { box-shadow: inset 0 0 0 2px #ef4444; }
      `}} />

      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, height: 56, position: 'sticky', top: 0, zIndex: 20 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => router.push('/dashboard/students')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> กลับ
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>เพิ่มนักเรียน</h1>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-sm" onClick={downloadTemplate} style={{ gap: 5 }}>
            <FileSpreadsheet size={13} /> ดาวน์โหลดแม่แบบ
          </button>
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()} style={{ gap: 5 }}>
            <Upload size={13} /> นำเข้า Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange} />

          {mode === 'table' ? (
            <button className="btn btn-primary" onClick={handlePreview} style={{ gap: 5 }}>
              <CheckCircle2 size={14} /> ตรวจสอบ & พรีวิว
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || validCount === 0} style={{ gap: 5, minWidth: 150 }}>
              {saving
                ? <><div className="spinner" /> {progress?.done}/{progress?.total}...</>
                : <><Save size={14} /> บันทึก {validCount} คน</>
              }
            </button>
          )}
        </div>
      </div>

      {saving && (
        <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{ height: '100%', background: 'var(--blue)', width: `${pct}%`, transition: 'width 0.3s ease' }} />
        </div>
      )}

      <div style={{ maxWidth: 1300, margin: '28px auto', padding: '0 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[
            { m: 'table' as Mode, label: '✏️ Spreadsheet' },
            { m: 'preview' as Mode, label: `👁️ พรีวิว${hasValidated ? ` (${rows.length})` : ''}` },
          ].map(({ m, label }) => (
            <button key={m}
              onClick={() => m === 'preview' ? handlePreview() : setMode('table')}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: m === mode ? 700 : 400, color: m === mode ? 'var(--blue)' : 'var(--text-3)', background: 'none', border: 'none', borderBottom: m === mode ? '2px solid var(--blue)' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── SPREADSHEET MODE ── */}
        {mode === 'table' && (
          <>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1E40AF', display: 'flex', gap: 10 }}>
              <span>💡</span>
              <div>
                <strong>เคล็ดลับ:</strong> คุณสามารถใช้ปุ่มลูกศรเพื่อเลื่อนช่องได้, กด Enter เพื่อลงบรรทัดใหม่, และสามารถ <strong>Copy จาก Excel แล้วกด Paste (Ctrl+V) ลงในตารางนี้ได้เลย</strong>
              </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th className="sheet-th sheet-td-fixed" style={{ width: 45 }}>#</th>
                      {cols.map(c => (
                        <th key={c.key} className="sheet-th" style={{ minWidth: c.w }}>
                          {c.label}{c.required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
                        </th>
                      ))}
                      <th className="sheet-th" style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const hasErr = row._status === 'error'
                      return (
                        <tr key={i} style={{ background: hasErr ? '#fef2f2' : undefined }}>
                          <td className="sheet-td sheet-td-fixed">{i + 1}</td>
                          
                          {cols.map((c, cIdx) => {
                            const isErrorCell = hasErr && c.required && !row[c.key]
                            return (
                              <td key={c.key} className="sheet-td">
                                {c.type === 'select' ? (
                                  <select 
                                    id={`cell-${i}-${cIdx}`}
                                    className={`sheet-input ${isErrorCell || (hasErr && c.key === 'grade' && !row.grade) ? 'error-cell' : ''}`}
                                    value={row[c.key]} 
                                    onChange={e => updateRow(i, c.key, e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, i, cIdx)}
                                    onPaste={e => handlePaste(e, i, cIdx)}
                                  >
                                    <option value="">เลือก...</option>
                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                ) : (
                                  <input 
                                    id={`cell-${i}-${cIdx}`}
                                    className={`sheet-input ${isErrorCell ? 'error-cell' : ''}`}
                                    type={c.type}
                                    placeholder={i === 0 ? `เช่น ${c.label}...` : ''} 
                                    value={row[c.key]}
                                    onChange={e => updateRow(i, c.key, e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, i, cIdx)}
                                    onPaste={e => handlePaste(e, i, cIdx)}
                                  />
                                )}
                              </td>
                            )
                          })}
                          
                          <td className="sheet-td" style={{ textAlign: 'center' }}>
                            <button className="btn btn-sm btn-ghost" tabIndex={-1} style={{ padding: '4px', color: '#94a3b8' }} onClick={() => removeRow(i)}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #cbd5e1', display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn btn-sm" onClick={addRow} style={{ gap: 5, background: 'white', border: '1px solid #cbd5e1' }}>
                  <Plus size={13} /> เพิ่มแถว (ลงล่างสุด)
                </button>
                <button className="btn btn-sm btn-ghost" style={{ color: '#EF4444', gap: 4 }}
                  onClick={() => { if (confirm('ล้างข้อมูลทั้งหมด?')) setRows([emptyRow(), emptyRow(), emptyRow()]) }}>
                  ล้างทั้งหมด
                </button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>รวม {rows.length} แถว</span>
              </div>
            </div>
          </>
        )}

        {/* ── PREVIEW MODE ── */}
        {mode === 'preview' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#DCFCE7', color: '#166534', borderRadius: 10, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
                <CheckCircle2 size={16} /> ถูกต้อง {validCount} รายการ
              </div>
              {errorCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', color: '#991B1B', borderRadius: 10, padding: '10px 18px', fontWeight: 600, fontSize: 14 }}>
                  <AlertCircle size={16} /> ข้อผิดพลาด {errorCount} รายการ — จะถูกข้าม
                </div>
              )}
              <button className="btn btn-sm" style={{ marginLeft: 'auto', gap: 5 }} onClick={() => setMode('table')}>
                <ArrowLeft size={12} /> กลับแก้ไข
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                      {['#','ชื่อ-สกุล','ชื่อเล่น','รหัส','ระดับชั้น','Email','รหัสผ่าน','สถานะ'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: row._status === 'error' ? '#FFF5F5' : i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{row.full_name || <span style={{ color: '#EF4444', fontStyle: 'italic' }}>ว่าง</span>}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-2)' }}>{row.nickname || '-'}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.student_id || '-'}</td>
                        <td style={{ padding: '9px 12px' }}>{row.grade ? <span className="badge badge-blue">{row.grade}</span> : <span style={{ color: '#EF4444' }}>-</span>}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.email || <span style={{ color: '#EF4444', fontStyle: 'italic' }}>ว่าง</span>}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: 'var(--text-3)', letterSpacing: 2 }}>{'•'.repeat(Math.min(row.password?.length ?? 0, 8))}</td>
                        <td style={{ padding: '9px 12px' }}>
                          {row._status === 'valid'
                            ? <span style={{ color: '#16A34A', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> ตกลง</span>
                            : <div>
                                <span style={{ color: '#DC2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={13} /> ข้ามรายการนี้</span>
                                {row._errors?.map((e, ei) => <div key={ei} style={{ fontSize: 11, color: '#DC2626', marginLeft: 17 }}>• {e}</div>)}
                              </div>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>รวม {rows.length} รายการ</span>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || validCount === 0} style={{ gap: 6, minWidth: 160 }}>
                  {saving
                    ? <><div className="spinner" /> {progress?.done}/{progress?.total}</>
                    : <><Save size={14} /> บันทึก {validCount} คน</>
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}