import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

export default async function QuizzesPage() {
  const supabase = await createClient()
  const profile = await getProfile()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .order('created_at', { ascending: false })

  const { data: mySubmissions } = await supabase
    .from('submissions')
    .select('quiz_id, score, is_passed')
    .eq('student_id', user!.id)

  const submissionMap = new Map(mySubmissions?.map(s => [s.quiz_id, s]) ?? [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes?.length === 0 && (
        <p className="text-gray-400 text-center col-span-3 py-16">ยังไม่มีแบบทดสอบ</p>
      )}
      {quizzes?.map(q => {
        const submission = submissionMap.get(q.id)
        const qCount = (q.questions as { count: number }[])?.[0]?.count ?? 0
        return (
          <div key={q.id} className={`card hover:shadow-md transition-shadow ${!q.is_open ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 leading-tight">{q.title}</h3>
              <span className={`badge ml-2 flex-shrink-0 ${q.is_open ? 'badge-green' : 'badge-red'}`}>
                {q.is_open ? 'เปิด' : 'ปิด'}
              </span>
            </div>

            <div className="space-y-1.5 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1.5">
                <span>📝</span> {qCount} ข้อ • ผ่าน {q.pass_score}%
              </div>
              {q.time_limit && (
                <div className="flex items-center gap-1.5">
                  <Clock size={13} /> {q.time_limit} นาที
                </div>
              )}
              {q.opens_at && (
                <div className="text-xs text-gray-400">
                  เปิด: {new Date(q.opens_at).toLocaleDateString('th-TH')} – {new Date(q.closes_at!).toLocaleDateString('th-TH')}
                </div>
              )}
            </div>

            {submission ? (
              <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${submission.is_passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {submission.is_passed ? <CheckCircle size={15} /> : <XCircle size={15} />}
                <span className="font-medium">คะแนน {submission.score?.toFixed(0)}% • {submission.is_passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
              </div>
            ) : q.is_open ? (
              <Link
                href={`/dashboard/quizzes/${q.id}/terms`}
                className="btn btn-primary w-full justify-center"
              >
                เริ่มทำแบบทดสอบ
              </Link>
            ) : (
              <button className="btn w-full justify-center" disabled>ยังไม่เปิด</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
