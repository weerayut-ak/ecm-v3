'use client'
import { useEffect, useRef } from 'react'

interface UseLeaveGuardOptions {
  enabled: boolean
  onLeave?: () => void
  message?: string
}

export function useLeaveGuard({ enabled, onLeave, message }: UseLeaveGuardOptions) {
  const warningCountRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        warningCountRef.current += 1
        onLeave?.()
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message ?? 'คุณยังทำแบบทดสอบไม่เสร็จ หากออกจากหน้านี้ข้อมูลจะหาย'
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, onLeave, message])

  return { warningCount: warningCountRef.current }
}
