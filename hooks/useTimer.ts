'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTimerOptions {
  initialSeconds: number
  onExpire?: () => void
  autoStart?: boolean
}

export function useTimer({ initialSeconds, onExpire, autoStart = false }: UseTimerOptions) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(autoStart)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  const clear = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => {
    if (!running) { clear(); return }
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clear()
          setRunning(false)
          onExpireRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clear
  }, [running, clear])

  const start = useCallback(() => setRunning(true), [])
  const stop  = useCallback(() => setRunning(false), [])
  const reset = useCallback(() => { stop(); setSeconds(initialSeconds) }, [initialSeconds, stop])

  const minutes = Math.floor(seconds / 60)
  const secs    = seconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const percent  = initialSeconds > 0 ? (seconds / initialSeconds) * 100 : 0
  const isWarning = seconds < 300 && seconds > 60
  const isDanger  = seconds <= 60 && seconds > 0

  return { seconds, display, percent, running, start, stop, reset, isWarning, isDanger }
}
