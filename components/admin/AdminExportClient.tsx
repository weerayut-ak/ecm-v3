'use client'

import { useState, useMemo } from 'react'
import {
  Download, Filter, FileSpreadsheet, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  GraduationCap, BarChart3,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Quiz {
  id: string
  title: string
}

interface Sub {
  id: string
  quiz_id: string
  score: number | null
  is_passed: boolean | null
  submitted_at: string
  time_taken: number | null
  student: {
    full_name: string
    student_id: string | null
    grade: string | null
    nickname: string | null
  } | null
  quiz: { title: string } | null
}

type ExportRow = Record<string, string | number>
type SortDir = 'asc' | 'desc'
type SortCol = 'name' | 'student_id' | 'grade' | 'quiz' | 'score' | 'is_passed' | 'time_taken' | 'submitted_at'
type PageItem = number | '...'

interface Column {
  key: SortCol
  label: string
  sortable: boolean
}

// ─── Export Helpers ───────────────────────────────────────────────────────────
function exportCSV(rows: ExportRow[], filename: string): void {
  const headers = Object.keys(rows[0])
  const escape = (v: string | number): string => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r: ExportRow) => headers.map(k => escape(r[k] as string | number)).join(',')),
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function exportXLS(rows: ExportRow[], filename: string, sheetName = 'คะแนน'): void {
  const headers = Object.keys(rows[0])
  const thCells = headers
    .map(h => `<th style="background:#1e40af;color:#fff;font-weight:bold;border:1px solid #ccc;padding:6px 10px">${h}</th>`)
    .join('')
  const trows = rows
    .map((r: ExportRow, i: number) => {
      const bg = i % 2 === 0 ? '#fff' : '#f0f4ff'
      const cells = headers
        .map(k => `<td style="border:1px solid #ddd;padding:5px 10px;background:${bg}">${r[k] ?? ''}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><title>${sheetName}</title></head>
<body><table><thead><tr>${thCells}</tr></thead><tbody>${trows}</tbody></table></body></html>`
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.xls`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Sort Icon ─────────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={13} style={{ color: '#d1d5db', marginLeft: 2 }} />
  return sortDir === 'asc'
    ? <ChevronUp size={13} style={{ color: '#6366f1', marginLeft: 2 }} />
    : <ChevronDown size={13} style={{ color: '#6366f1', marginLeft: 2 }} />
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminExportClient({
  quizzes,
  submissions,
}: {
  quizzes: Quiz[]
  submissions: Sub[]
}) {
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx')
  const [sortCol, setSortCol] = useState<SortCol>('submitted_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)

  const filtered = useMemo<Sub[]>(() =>
    submissions.filter((s: Sub) => selectedQuiz === 'all' || s.quiz_id === selectedQuiz),
    [submissions, selectedQuiz],
  )

  const sorted = useMemo<Sub[]>(() => {
    const copy = [...filtered]
    copy.sort((a: Sub, b: Sub) => {
      let av: string | number
      let bv: string | number
      switch (sortCol) {
        case 'name':         av = a.student?.full_name ?? ''; bv = b.student?.full_name ?? ''; break
        case 'student_id':   av = a.student?.student_id ?? ''; bv = b.student?.student_id ?? ''; break
        case 'grade':        av = a.student?.grade ?? ''; bv = b.student?.grade ?? ''; break
        case 'quiz':         av = a.quiz?.title ?? ''; bv = b.quiz?.title ?? ''; break
        case 'score':        av = a.score ?? 0; bv = b.score ?? 0; break
        case 'is_passed':    av = a.is_passed ? 1 : 0; bv = b.is_passed ? 1 : 0; break
        case 'time_taken':   av = a.time_taken ?? 0; bv = b.time_taken ?? 0; break
        case 'submitted_at': av = a.submitted_at; bv = b.submitted_at; break
        default: return 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filtered, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageData   = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggleSort(col: SortCol): void {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  function handleQuizChange(v: string): void { setSelectedQuiz(v); setPage(1) }

  function buildRows(): ExportRow[] {
    return sorted.map((s: Sub) => ({
      'ชื่อ-สกุล':         s.student?.full_name ?? '',
      'ชื่อเล่น':          s.student?.nickname ?? '',
      'รหัสนักเรียน':      s.student?.student_id ?? '',
      'ระดับชั้น':         s.student?.grade ?? '',
      'แบบทดสอบ':          s.quiz?.title ?? '',
      'คะแนน (%)':         s.score != null ? parseFloat(s.score.toFixed(1)) : '',
      'ผ่าน/ไม่ผ่าน':     s.is_passed ? 'ผ่าน' : 'ไม่ผ่าน',
      'เวลาที่ใช้ (วินาที)': s.time_taken ?? '',
      'วันที่ส่ง':          new Date(s.submitted_at).toLocaleDateString('th-TH'),
    }))
  }

  function doExport(): void {
    const rows = buildRows()
    if (!rows.length) { alert('ไม่มีข้อมูลที่จะนำออก'); return }
    const qTitle = selectedQuiz === 'all'
      ? 'ทั้งหมด'
      : (quizzes.find((q: Quiz) => q.id === selectedQuiz)?.title ?? '')
    const filename = `คะแนน_${qTitle}`
    if (format === 'csv') exportCSV(rows, filename)
    else exportXLS(rows, filename, 'คะแนน')
  }

  const columns: Column[] = [
    { key: 'name',         label: 'ชื่อ-สกุล',   sortable: true },
    { key: 'student_id',   label: 'รหัส',         sortable: true },
    { key: 'grade',        label: 'ชั้น',          sortable: true },
    { key: 'quiz',         label: 'แบบทดสอบ',     sortable: true },
    { key: 'score',        label: 'คะแนน',        sortable: true },
    { key: 'is_passed',    label: 'ผล',            sortable: true },
    { key: 'time_taken',   label: 'เวลา (วิ)',     sortable: true },
    { key: 'submitted_at', label: 'วันที่ส่ง',     sortable: true },
  ]

  const passCount = filtered.filter((s: Sub) => s.is_passed).length
  const avgScore  = filtered.length
    ? (filtered.reduce((a: number, s: Sub) => a + (s.score ?? 0), 0) / filtered.length).toFixed(1)
    : '—'
  const passRate  = filtered.length
    ? ((passCount / filtered.length) * 100).toFixed(0)
    : '—'

  // Build page-number items: number or ellipsis marker
  const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce<PageItem[]>((acc, p, idx, arr) => {
      if (idx > 0 && (arr[idx - 1] as number) !== p - 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1.5rem', color: '#1e293b' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap size={20} color='#fff' />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>นำออกข้อมูลคะแนน</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{submissions.length} รายการทั้งหมด</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.25rem' }}>
        {([
          { label: 'รายการที่เลือก', value: filtered.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'อัตราผ่าน',     value: `${passRate}%`,  color: '#059669', bg: '#ecfdf5' },
          { label: 'คะแนนเฉลี่ย',   value: `${avgScore}%`,  color: '#0ea5e9', bg: '#f0f9ff' },
        ] as const).map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 12, color: s.color, fontWeight: 600, opacity: 0.8 }}>{s.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Export */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Filter size={14} color='#6366f1' />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>ตัวกรองและการนำออก</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'end' }}>
          {/* Quiz select */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>เลือกแบบทดสอบ</label>
            <select
              value={selectedQuiz}
              onChange={e => handleQuizChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: '#f8fafc', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              <option value='all'>ทั้งหมด ({submissions.length} รายการ)</option>
              {quizzes.map((q: Quiz) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({submissions.filter((s: Sub) => s.quiz_id === q.id).length} คน)
                </option>
              ))}
            </select>
          </div>

          {/* Format toggle */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>รูปแบบไฟล์</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { val: 'xlsx' as const, icon: <FileSpreadsheet size={15} />, label: 'Excel (.xls)' },
                { val: 'csv'  as const, icon: <FileText size={15} />,        label: 'CSV' },
              ]).map(f => (
                <button
                  key={f.val}
                  onClick={() => setFormat(f.val)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                    transition: 'all .15s',
                    ...(format === f.val
                      ? { background: '#eef2ff', borderColor: '#6366f1', color: '#4338ca' }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }),
                  }}
                >{f.icon}{f.label}</button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={doExport}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px',
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(99,102,241,.35)',
            }}
          >
            <Download size={15} />
            นำออก {filtered.length} รายการ
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={15} color='#6366f1' />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>ตัวอย่างข้อมูล</span>
            <span style={{ fontSize: 12, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>{filtered.length} รายการ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>แสดงหน้าละ</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: '#f8fafc' }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} รายการ</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '0 8px', width: 36, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>#</th>
                {columns.map((col: Column) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    style={{
                      padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12,
                      color: sortCol === col.key ? '#4338ca' : '#64748b',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                      borderBottom: sortCol === col.key ? '2px solid #6366f1' : '2px solid transparent',
                      transition: 'color .15s',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {pageData.map((s: Sub, i: number) => {
                const rowNum  = (safePage - 1) * pageSize + i + 1
                const isEven  = i % 2 === 1
                const bgBase  = isEven ? '#fafafa' : '#fff'
                return (
                  <tr
                    key={s.id}
                    style={{ background: bgBase, transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = bgBase)}
                  >
                    <td style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 11, padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{rowNum}</td>

                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                      <div>{s.student?.full_name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({s.student?.nickname ?? ''})</div>
                    </td>

                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{s.student?.student_id ?? '—'}</td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                        {s.student?.grade ?? '—'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.quiz?.title ?? '—'}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, width: 60, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${s.score ?? 0}%`, borderRadius: 99,
                            background: (s.score ?? 0) >= 80 ? '#10b981' : (s.score ?? 0) >= 60 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ fontWeight: 700, color: (s.score ?? 0) >= 80 ? '#059669' : (s.score ?? 0) >= 60 ? '#d97706' : '#dc2626', fontSize: 13 }}>
                          {s.score != null ? `${s.score.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
                        padding: '4px 10px', borderRadius: 20,
                        ...(s.is_passed
                          ? { background: '#dcfce7', color: '#15803d' }
                          : { background: '#fee2e2', color: '#b91c1c' }),
                      }}>
                        {s.is_passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {s.time_taken != null
                        ? `${Math.floor(s.time_taken / 60)}:${String(s.time_taken % 60).padStart(2, '0')}`
                        : '—'}
                    </td>

                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(s.submitted_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            แสดง {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} จาก {sorted.length} รายการ
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {([
              { icon: <ChevronsLeft size={14} />, action: () => setPage(1),                              disabled: safePage === 1 },
              { icon: <ChevronLeft  size={14} />, action: () => setPage(p => Math.max(1, p - 1)),        disabled: safePage === 1 },
            ] as const).map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled} style={{
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: '1px solid #e2e8f0',
                background: btn.disabled ? '#f8fafc' : '#fff',
                color:      btn.disabled ? '#cbd5e1' : '#64748b',
                cursor:     btn.disabled ? 'not-allowed' : 'pointer',
              }}>{btn.icon}</button>
            ))}

            {pageItems.map((p: PageItem, i: number) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: 13 }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)} style={{
                  minWidth: 30, height: 30, padding: '0 6px', borderRadius: 6, border: '1px solid',
                  fontSize: 13, fontWeight: p === safePage ? 700 : 400, cursor: 'pointer',
                  ...(p === safePage
                    ? { background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }
                    : { background: '#fff',    borderColor: '#e2e8f0', color: '#64748b' }),
                }}>{p}</button>
              )
            )}

            {([
              { icon: <ChevronRight  size={14} />, action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: safePage === totalPages },
              { icon: <ChevronsRight size={14} />, action: () => setPage(totalPages),                       disabled: safePage === totalPages },
            ] as const).map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled} style={{
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: '1px solid #e2e8f0',
                background: btn.disabled ? '#f8fafc' : '#fff',
                color:      btn.disabled ? '#cbd5e1' : '#64748b',
                cursor:     btn.disabled ? 'not-allowed' : 'pointer',
              }}>{btn.icon}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}