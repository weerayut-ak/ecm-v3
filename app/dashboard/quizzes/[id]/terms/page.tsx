import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, Target, AlertTriangle } from 'lucide-react'

export default async function QuizTermsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .eq('id', id)
    .single()

  if (!quiz) notFound()
  if (!quiz.is_open) redirect('/dashboard/quizzes')

  // Check if already submitted
  const { data: submission } = await supabase
    .from('submissions')
    .select('id')
    .eq('quiz_id', id)
    .eq('student_id', user!.id)
    .single()

  if (submission) redirect(`/dashboard/quizzes/${id}/result`)

  const qCount = (quiz.questions as { count: number }[])?.[0]?.count ?? 0

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{quiz.title}</h1>
          {quiz.description && <p className="text-gray-500 text-sm mt-1">{quiz.description}</p>}
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="stat-card text-center">
            <div className="text-2xl font-semibold text-gray-900">{qCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">จำนวนข้อ</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-semibold text-gray-900">{quiz.pass_score}%</div>
            <div className="text-xs text-gray-400 mt-0.5">คะแนนผ่าน</div>
          </div>
          {quiz.time_limit && (
            <div className="stat-card text-center col-span-2">
              <div className="flex items-center justify-center gap-2 text-primary-700">
                <Clock size={16} />
                <span className="text-lg font-semibold">{quiz.time_limit} นาที</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">จำกัดเวลา</div>
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="font-medium text-amber-800 text-sm">ข้อกำหนดและเงื่อนไข</span>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-800">
            <li>1. ห้ามออกจากหน้าแบบทดสอบระหว่างทำ ระบบจะตรวจจับและแจ้งเตือน</li>
            <li>2. เมื่อส่งแบบทดสอบแล้ว ไม่สามารถกลับมาแก้ไขได้</li>
            <li>3. {quiz.time_limit ? `มีเวลาทำ ${quiz.time_limit} นาที หากหมดเวลา ระบบจะส่งอัตโนมัติ` : 'ไม่มีการจำกัดเวลา'}</li>
            <li>4. ตอบทุกข้อก่อนกดส่ง</li>
            <li>5. ผลคะแนนจะแสดงทันทีหลังส่ง</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/dashboard/quizzes" className="btn w-full justify-center">ยกเลิก</Link>
          <Link
            href={`/dashboard/quizzes/${quiz.id}/attempt`}
            className="btn btn-primary w-full justify-center"
          >
            ยอมรับและเริ่มทำ
          </Link>
        </div>
      </div>
    </div>
  )
}
