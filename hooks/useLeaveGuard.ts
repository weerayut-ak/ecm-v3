'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLeaveGuardOptions {
  enabled: boolean
  onLeave?: () => void
  message?: string
  quizId?: string
  userId?: string
}

export function useLeaveGuard({ enabled, onLeave, message, quizId, userId }: UseLeaveGuardOptions) {
  const warningCountRef = useRef(0)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled || !quizId || !userId) return

    // สร้าง/อัพเดท session เมื่อเริ่มทำ
    supabase.from('quiz_sessions').upsert({
      student_id: userId, quiz_id: quizId, status: 'active', last_seen: new Date().toISOString()
    }, { onConflict: 'student_id,quiz_id' })

    // อัพเดท last_seen ทุก 10 วินาที
    const heartbeat = setInterval(() => {
      supabase.from('quiz_sessions').update({ last_seen: new Date().toISOString() })
        .eq('student_id', userId).eq('quiz_id', quizId)
    }, 10000)

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        warningCountRef.current += 1
        onLeave?.()
        // บันทึกการออกจากหน้า
        await supabase.from('quiz_sessions').update({
          status: 'left',
          leave_count: warningCountRef.current,
          last_seen: new Date().toISOString()
        }).eq('student_id', userId).eq('quiz_id', quizId)
      } else {
        // กลับมาแล้ว
        await supabase.from('quiz_sessions').update({
          status: 'active',
          last_seen: new Date().toISOString()
        }).eq('student_id', userId).eq('quiz_id', quizId)
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message ?? 'คุณยังทำแบบทดสอบไม่เสร็จ หากออกจากหน้านี้ข้อมูลจะหาย'
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, quizId, userId])

  return { warningCount: warningCountRef.current }
}