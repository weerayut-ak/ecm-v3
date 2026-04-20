import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedRow {
  [key: string]: string | number
}

export async function parseExcelOrCSV(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data as ParsedRow[]),
        error: reject,
      })
    })
  }
  // xlsx / xls
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<ParsedRow>(ws)
}

export function normalizeScoreRows(rows: ParsedRow[]) {
  return rows.map(row => {
    const keys = Object.keys(row)

    // หาคอลัมน์ชื่อ - รองรับทั้งภาษาไทยและอังกฤษ
    const nameKey = keys.find(k =>
      k.includes('ชื่อ') || k.toLowerCase().includes('name')
    ) ?? keys[0]

    // หาคอลัมน์รหัส
    const idKey = keys.find(k =>
      k.includes('รหัส') || k.toLowerCase().includes('id') || k.toLowerCase().includes('student')
    )

    // หาคอลัมน์คะแนน
    const scoreKey = keys.find(k =>
      k.includes('คะแนน') || k.toLowerCase().includes('score') || k.toLowerCase().includes('point')
    )

    const name = String(row[nameKey] ?? '')
    const studentId = idKey ? String(row[idKey] ?? '') : ''
    const score = scoreKey ? Number(row[scoreKey] ?? 0) : 0

    return { name, studentId, score, grade: getGrade(score) }
  }).filter(r => r.name.trim() !== '')
}

function getGrade(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  return 'F'
}