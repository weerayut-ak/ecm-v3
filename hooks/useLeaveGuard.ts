'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLeaveGuardOptions {
  enabled: boolean
  onLeave?: (count: number) => void
  quizId?: string
  userId?: string
}

export function useLeaveGuard({ enabled, onLeave, quizId, userId }: UseLeaveGuardOptions) {
  const warningCountRef = useRef(0)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled || !quizId || !userId) return

    // Create/update session on mount
    supabase.from('quiz_sessions').upsert({
      student_id: userId,
      quiz_id: quizId,
      status: 'active',
      leave_count: 0,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'student_id,quiz_id' })

    // Heartbeat every 10s
    const heartbeat = setInterval(() => {
      supabase.from('quiz_sessions')
        .update({ last_seen: new Date().toISOString() })
        .eq('student_id', userId).eq('quiz_id', quizId)
    }, 10000)

    const handleVisibilityChange = async () => {
      if (!document.hidden) return
      warningCountRef.current += 1
      const count = warningCountRef.current
      onLeave?.(count)

      const newStatus = count >= 3 ? 'blocked' : 'left'
      await supabase.from('quiz_sessions').update({
        status: newStatus,
        leave_count: count,
        last_seen: new Date().toISOString(),
      }).eq('student_id', userId).eq('quiz_id', quizId)
    }

    const handleVisibilityReturn = async () => {
      if (document.hidden) return
      await supabase.from('quiz_sessions').update({
        status: warningCountRef.current >= 3 ? 'blocked' : 'active',
        last_seen: new Date().toISOString(),
      }).eq('student_id', userId).eq('quiz_id', quizId)
    }

    const handleVisibility = () => {
      if (document.hidden) handleVisibilityChange()
      else handleVisibilityReturn()
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'คุณยังทำแบบทดสอบไม่เสร็จ หากออกจากหน้านี้ข้อมูลจะหาย'
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, quizId, userId])

  return { warningCount: warningCountRef.current }
}
