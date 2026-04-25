// @/hooks/useLeaveGuard.ts
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLeaveGuardOptions {
  enabled: boolean
  onLeave?: (count: number) => void
  quizId?: string
  userId?: string
  initialCount?: number
}

export function useLeaveGuard({
  enabled,
  onLeave,
  quizId,
  userId,
  initialCount = 0,
}: UseLeaveGuardOptions) {
  const supabase = createClient()

  // ทุก prop เก็บใน ref — handler อ่านค่าล่าสุดเสมอ ไม่มี stale closure
  const countRef      = useRef(initialCount)
  const onLeaveRef    = useRef(onLeave)
  const quizIdRef     = useRef(quizId)
  const userIdRef     = useRef(userId)
  // กันยิงซ้ำถ้า visibilitychange เกิดหลายครั้งติดกัน
  const processingRef = useRef(false)

  useEffect(() => { onLeaveRef.current = onLeave }, [onLeave])
  useEffect(() => { quizIdRef.current  = quizId  }, [quizId])
  useEffect(() => { userIdRef.current  = userId  }, [userId])

  // sync initialCount → countRef เมื่อโหลดจาก DB ครั้งแรก
  useEffect(() => {
    countRef.current = initialCount
  }, [initialCount])

  // ✅ KEY FIX: handler นี้ไม่เช็ค enabled เลย
  // เพราะถ้าออกครั้งที่ 3 → setBlocked(true) → enabled=false เกิดขึ้น
  // แต่ event นี้ยิงก่อน re-render — ต้องให้บันทึก DB ได้เสมอ
  const handleVisibility = useCallback(async () => {
    if (!quizIdRef.current || !userIdRef.current) return
    if (!document.hidden) return
    if (processingRef.current) return

    processingRef.current = true

    const newCount  = countRef.current + 1
    const newStatus = newCount >= 3 ? 'blocked' : 'active'

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        status:      newStatus,
        leave_count: newCount,
        last_seen:   new Date().toISOString(),
      })
      .eq('student_id', userIdRef.current)
      .eq('quiz_id',    quizIdRef.current)

    processingRef.current = false

    if (error) {
      console.error('[useLeaveGuard] DB update failed', error)
      return
    }

    // commit count และแจ้ง UI หลัง DB สำเร็จเท่านั้น
    countRef.current = newCount
    onLeaveRef.current?.(newCount)
  }, []) // stable ref — ไม่ re-create ตลอดชีวิต component

  // ✅ listener ติดตั้งเมื่อ session พร้อม ถอดเมื่อ submit เท่านั้น
  // ไม่ถอดเมื่อ blocked — เพราะ blocked screen = component unmount อยู่แล้ว
  useEffect(() => {
    if (!enabled || !quizId || !userId) return

    const heartbeat = setInterval(() => {
      supabase
        .from('quiz_sessions')
        .update({ last_seen: new Date().toISOString() })
        .eq('student_id', userId)
        .eq('quiz_id',    quizId)
    }, 10_000)

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'คุณยังทำแบบทดสอบไม่เสร็จ'
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, quizId, userId, handleVisibility])

  return { warningCount: countRef.current }
}