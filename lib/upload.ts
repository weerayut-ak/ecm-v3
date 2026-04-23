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
        dynamicTyping: true,
        complete: (result) => resolve(result.data as ParsedRow[]),
        error: reject,
      })
    })
  }
  // xlsx / xls — preserve original columns exactly
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
}

// normalizeScoreRows: keep ALL original columns from the file,
// just ensure there is at least a 'score'-like number column for colour coding
export function normalizeScoreRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined))
}