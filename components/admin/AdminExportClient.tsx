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
  if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500 ml-1 inline" />
    : <ChevronDown className="w-3.5 h-3.5 text-indigo-500 ml-1 inline" />
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
    { key: 'student_id',   label: 'รหัส',        sortable: true },
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
    <div className="font-sans max-w-6xl mx-auto p-4 sm:p-6 text-slate-800">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="m-0 text-lg sm:text-xl font-bold text-slate-900">นำออกข้อมูลคะแนน</h1>
          <p className="m-0 text-xs sm:text-sm text-slate-500">{submissions.length} รายการทั้งหมด</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {([
          { label: 'รายการที่เลือก', value: filtered.length, colorText: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'อัตราผ่าน',     value: `${passRate}%`,  colorText: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'คะแนนเฉลี่ย',   value: `${avgScore}%`,  colorText: 'text-sky-600', bg: 'bg-sky-50' },
        ] as const).map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`m-0 text-xs font-semibold opacity-80 ${s.colorText}`}>{s.label}</p>
            <p className={`mt-1 mb-0 text-2xl font-bold ${s.colorText}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-sm text-slate-800">ตัวกรองและการนำออก</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          {/* Quiz select */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">เลือกแบบทดสอบ</label>
            <select
              value={selectedQuiz}
              onChange={e => handleQuizChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
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
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">รูปแบบไฟล์</label>
            <div className="flex gap-2">
              {([
                { val: 'xlsx' as const, icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Excel (.xls)' },
                { val: 'csv'  as const, icon: <FileText className="w-4 h-4" />,        label: 'CSV' },
              ]).map(f => (
                <button
                  key={f.val}
                  onClick={() => setFormat(f.val)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold cursor-pointer border-2 transition-all ${
                    format === f.val
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={doExport}
            className="flex items-center justify-center w-full md:w-auto gap-2 px-5 py-2 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white border-none rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap shadow-md shadow-indigo-500/30 hover:opacity-90 transition-opacity min-h-[40px]"
          >
            <Download className="w-4 h-4" />
            นำออก {filtered.length} รายการ
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-100 gap-3 bg-white">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-sm text-slate-800">ตัวอย่างข้อมูล</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} รายการ</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500">แสดงหน้าละ</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-800 bg-slate-50 outline-none focus:border-indigo-500"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} รายการ</option>)}
            </select>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3 w-10 text-center font-semibold text-xs border-b border-slate-200">#</th>
                {columns.map((col: Column) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={`px-3 py-3 font-semibold text-xs whitespace-nowrap border-b-2 transition-colors ${
                      col.sortable ? 'cursor-pointer hover:text-indigo-600' : 'cursor-default'
                    } ${sortCol === col.key ? 'border-indigo-500 text-indigo-700' : 'border-slate-200'}`}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-10 text-slate-400 text-sm">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {pageData.map((s: Sub, i: number) => {
                const rowNum  = (safePage - 1) * pageSize + i + 1
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-indigo-50/50 transition-colors bg-white even:bg-slate-50/50"
                  >
                    <td className="text-center text-slate-300 text-xs px-3 py-3 tabular-nums">{rowNum}</td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{s.student?.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-400">({s.student?.nickname ?? ''})</div>
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{s.student?.student_id ?? '—'}</td>

                    <td className="px-3 py-3">
                      <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                        {s.student?.grade ?? '—'}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-slate-600 text-xs max-w-[140px] truncate" title={s.quiz?.title ?? ''}>
                      {s.quiz?.title ?? '—'}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (s.score ?? 0) >= 80 ? 'bg-emerald-500' : (s.score ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${s.score ?? 0}%` }}
                          />
                        </div>
                        <span className={`font-bold text-xs ${
                          (s.score ?? 0) >= 80 ? 'text-emerald-600' : (s.score ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {s.score != null ? `${s.score.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        s.is_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {s.is_passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-slate-400 text-xs tabular-nums">
                      {s.time_taken != null
                        ? `${Math.floor(s.time_taken / 60)}:${String(s.time_taken % 60).padStart(2, '0')}`
                        : '—'}
                    </td>

                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(s.submitted_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-slate-50 gap-4">
          <span className="text-xs text-slate-500">
            แสดง {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} จาก {sorted.length} รายการ
          </span>
          
          <div className="flex gap-1 items-center">
            {([
              { icon: <ChevronsLeft className="w-4 h-4" />, action: () => setPage(1), disabled: safePage === 1 },
              { icon: <ChevronLeft className="w-4 h-4" />,  action: () => setPage(p => Math.max(1, p - 1)), disabled: safePage === 1 },
            ] as const).map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                disabled={btn.disabled}
                className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                  btn.disabled
                    ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                {btn.icon}
              </button>
            ))}

            {pageItems.map((p: PageItem, i: number) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md border text-xs transition-colors ${
                    p === safePage
                      ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {([
              { icon: <ChevronRight className="w-4 h-4" />,  action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: safePage === totalPages },
              { icon: <ChevronsRight className="w-4 h-4" />, action: () => setPage(totalPages), disabled: safePage === totalPages },
            ] as const).map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                disabled={btn.disabled}
                className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                  btn.disabled
                    ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  )
}