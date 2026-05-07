// @/hooks/useLeaveGuard.ts
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLeaveGuardOptions {
  enabled:       boolean
  quizId?:       string
  userId?:       string
  initialCount?: number
  onLeave?:      (count: number) => void
}

export function useLeaveGuard({
  enabled,
  quizId,
  userId,
  initialCount = 0,
  onLeave,
}: UseLeaveGuardOptions) {
  const supabaseRef = useRef(createClient())
  const countRef      = useRef(initialCount)
  const enabledRef    = useRef(enabled)
  const submittingRef = useRef(false)
  const onLeaveRef    = useRef(onLeave)
  const quizIdRef     = useRef(quizId)
  const userIdRef     = useRef(userId)
  const processingRef = useRef(false)
  const mountedRef    = useRef(true)

  useEffect(() => { enabledRef.current  = enabled  }, [enabled])
  useEffect(() => { onLeaveRef.current  = onLeave  }, [onLeave])
  useEffect(() => { quizIdRef.current   = quizId   }, [quizId])
  useEffect(() => { userIdRef.current   = userId   }, [userId])

  useEffect(() => {
    if (initialCount > countRef.current) {
      countRef.current = initialCount
    }
  }, [initialCount])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const handleVisibility = useCallback(async () => {
    if (!document.hidden) return
    if (submittingRef.current) return
    if (!enabledRef.current) return
    if (processingRef.current) return
    if (!quizIdRef.current || !userIdRef.current) return

    processingRef.current = true

    const newCount  = countRef.current + 1
    const newStatus = newCount >= 3 ? 'blocked' : 'active'

    const { error } = await supabaseRef.current
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
      console.error('[useLeaveGuard] DB update failed:', error.message)
      return
    }

    countRef.current = newCount
    if (mountedRef.current) {
      onLeaveRef.current?.(newCount)
    }
  }, [])

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!enabledRef.current) return
    e.preventDefault()
    e.returnValue = 'คุณยังทำแบบทดสอบไม่เสร็จ'
  }, [])

  useEffect(() => {
    if (!enabled || !quizId || !userId) return

    const heartbeat = setInterval(() => {
      if (!enabledRef.current) return
      supabaseRef.current
        .from('quiz_sessions')
        .update({ last_seen: new Date().toISOString() })
        .eq('student_id', userId)
        .eq('quiz_id',    quizId)
        .then()
    }, 10_000)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, quizId, userId, handleVisibility, handleBeforeUnload])

  const setSubmitting = useCallback((val: boolean) => {
    submittingRef.current = val
  }, [])

  return {
    warningCount: countRef.current,
    setSubmitting,
  }
}