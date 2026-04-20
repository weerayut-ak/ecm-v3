import * as XLSX from 'xlsx'

export interface ExportRow {
  [key: string]: string | number | null | undefined
}

export function exportToCSV(data: ExportRow[], filename: string) {
  const headers = Object.keys(data[0] || {})
  const rows = data.map(row => headers.map(h => row[h] ?? '').join(','))
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename + '.csv')
}

export function exportToXLSX(data: ExportRow[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename + '.xlsx')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildScoreExportRows(submissions: {
  student: { full_name: string; student_id: string | null; grade: string | null }
  quiz: { title: string }
  score: number | null
  is_passed: boolean | null
  submitted_at: string
}[]) {
  return submissions.map(s => ({
    'ชื่อ-สกุล': s.student.full_name,
    'รหัสนักเรียน': s.student.student_id ?? '',
    'ระดับชั้น': s.student.grade ?? '',
    'แบบทดสอบ': s.quiz.title,
    'คะแนน (%)': s.score ?? '',
    'ผ่าน/ไม่ผ่าน': s.is_passed ? 'ผ่าน' : 'ไม่ผ่าน',
    'วันที่ส่ง': new Date(s.submitted_at).toLocaleDateString('th-TH'),
  }))
}
