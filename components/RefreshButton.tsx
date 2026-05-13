"use client"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { RefreshCw } from "lucide-react"

export default function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      title="รีเฟรช"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8, fontSize: 13,
        border: "1px solid var(--border)", background: "var(--surface)",
        color: "var(--text-2)", cursor: isPending ? "wait" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <RefreshCw
        size={13}
        style={{ animation: isPending ? "spin 0.6s linear infinite" : "none" }}
      />
      {isPending ? "กำลังโหลด..." : "รีเฟรช"}
    </button>
  )
}