'use client'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleRefresh}
      className="btn btn-sm"
      title="รีเฟรช"
      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
    >
      <RefreshCw
        size={13}
        style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }}
      />
      รีเฟรช
    </button>
  )
}