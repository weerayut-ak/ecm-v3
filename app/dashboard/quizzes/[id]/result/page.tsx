import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react'

export default async function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: quiz }, { data: submission }] = await Promise.all([
    supabase.from('quizzes').select('*').eq('id', id).single(),
    supabase.from('submissions').select('*').eq('quiz_id', id).eq('student_id', user!.id).single(),
  ])

  if (!quiz || !submission) notFound()

  const score = submission.score ?? 0
  const passed = submission.is_passed ?? false
  const timeMins = submission.time_taken ? Math.floor(submission.time_taken / 60) : null
  const timeSecs = submission.time_taken ? submission.time_taken % 60 : null

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <div className="mb-6">
          {passed
            ? <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto"><CheckCircle size={44} /></div>
            : <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto"><XCircle size={44} /></div>
          }
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-1">{quiz.title}</h1>
        <p className="text-gray-400 text-sm mb-6">ผลการทำแบบทดสอบ</p>

        {/* Score */}
        <div className="mb-6">
          <div className={`text-5xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {score.toFixed(0)}%
          </div>
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${
            passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {passed ? <><CheckCircle size={14} /> ผ่าน</> : <><XCircle size={14} /> ไม่ผ่าน</>}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="stat-card">
            <p className="text-xs text-gray-400">เกณฑ์ผ่าน</p>
            <p className="text-xl font-semibold mt-0.5">{quiz.pass_score}%</p>
          </div>
          {timeMins !== null && (
            <div className="stat-card">
              <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> เวลาที่ใช้</p>
              <p className="text-xl font-semibold mt-0.5">
                {timeMins}:{String(timeSecs).padStart(2,'0')}
              </p>
            </div>
          )}
        </div>

        {/* Message */}
        <div className={`p-3 rounded-xl text-sm mb-6 ${passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {passed
            ? '🎉 ยินดีด้วย! คุณผ่านแบบทดสอบนี้แล้ว'
            : '😔 ยังไม่ผ่านเกณฑ์ ลองทบทวนเนื้อหาและทำใหม่อีกครั้ง'}
        </div>

        <Link href="/dashboard/quizzes" className="btn btn-primary w-full justify-center">
          <RotateCcw size={14} /> กลับสู่รายการแบบทดสอบ
        </Link>
      </div>
    </div>
  )
}
