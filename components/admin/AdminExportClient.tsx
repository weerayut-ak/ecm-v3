'use client'
import { useState, useMemo } from 'react'
import { exportToCSV, exportToXLSX } from '@/lib/export'
import { Download, Filter } from 'lucide-react'

interface Quiz { id: string; title: string }
interface Sub {
  id: string; quiz_id: string; score: number | null; is_passed: boolean | null
  submitted_at: string; time_taken: number | null
  student: { full_name: string; student_id: string | null; grade: string | null; nickname: string | null } | null
  quiz: { title: string } | null
}

export default function AdminExportClient({ quizzes, submissions }: { quizzes: Quiz[]; submissions: Sub[] }) {
  const [selectedQuiz, setSelectedQuiz] = useState('all')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx')

  const filtered = useMemo(() =>
    submissions.filter(s => selectedQuiz === 'all' || s.quiz_id === selectedQuiz),
    [submissions, selectedQuiz]
  )

  function doExport() {
    const rows = filtered.map(s => ({
      'ชื่อ-สกุล': s.student?.full_name ?? '',
      'ชื่อเล่น': s.student?.nickname ?? '',
      'รหัสนักเรียน': s.student?.student_id ?? '',
      'ระดับชั้น': s.student?.grade ?? '',
      'แบบทดสอบ': s.quiz?.title ?? '',
      'คะแนน (%)': s.score?.toFixed(1) ?? '',
      'ผ่าน/ไม่ผ่าน': s.is_passed ? 'ผ่าน' : 'ไม่ผ่าน',
      'เวลาที่ใช้ (วินาที)': s.time_taken ?? '',
      'วันที่ส่ง': new Date(s.submitted_at).toLocaleDateString('th-TH'),
    }))
    if (rows.length === 0) { alert('ไม่มีข้อมูลที่จะนำออก'); return }
    const filename = `คะแนน_${selectedQuiz === 'all' ? 'ทั้งหมด' : quizzes.find(q => q.id === selectedQuiz)?.title ?? ''}`
    if (format === 'csv') exportToCSV(rows, filename)
    else exportToXLSX(rows, filename, 'คะแนน')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">นำออกข้อมูลคะแนน</h1>
        <p className="text-sm text-gray-400">{submissions.length} รายการทั้งหมด</p>
      </div>

      <div className="card">
        <h3 className="font-medium mb-4 flex items-center gap-2"><Filter size={15} /> ตัวกรอง</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">เลือกแบบทดสอบ</label>
            <select className="input-field" value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
              <option value="all">ทั้งหมด ({submissions.length} รายการ)</option>
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title} ({submissions.filter(s => s.quiz_id === q.id).length} คน)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">รูปแบบไฟล์</label>
            <div className="flex gap-2">
              {(['xlsx', 'csv'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${format === f ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {f === 'xlsx' ? '📊 Excel' : '📄 CSV'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={doExport}>
          <Download size={14} /> นำออก {filtered.length} รายการ
        </button>
      </div>

      {/* Preview table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-medium text-sm">ตัวอย่างข้อมูล ({filtered.length} รายการ)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['ชื่อ-สกุล', 'รหัส', 'ชั้น', 'แบบทดสอบ', 'คะแนน', 'ผลการสอบ', 'วันที่'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              )}
              {filtered.slice(0, 20).map(s => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">{s.student?.full_name ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.student?.student_id ?? '-'}</td>
                  <td className="px-4 py-2.5"><span className="badge badge-blue">{s.student?.grade ?? '-'}</span></td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{s.quiz?.title ?? '-'}</td>
                  <td className="px-4 py-2.5 font-semibold">{s.score?.toFixed(0) ?? '-'}%</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${s.is_passed ? 'badge-green' : 'badge-red'}`}>
                      {s.is_passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(s.submitted_at).toLocaleDateString('th-TH')}
                  </td>
                </tr>
              ))}
              {filtered.length > 20 && (
                <tr><td colSpan={7} className="text-center py-3 text-sm text-gray-400">... และอีก {filtered.length - 20} รายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
