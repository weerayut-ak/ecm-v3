'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Bell, X, CheckCheck, ClipboardList,
  Megaphone, UserCheck, ChevronRight, Inbox, Trash2, Calendar,
} from 'lucide-react'

type NotiType = 'quiz_submission' | 'new_quiz' | 'new_announcement' | 'new_appointment'
interface Notification {
  id: string; type: NotiType; title: string; body: string | null
  link: string | null; is_read: boolean; metadata: Record<string, unknown>; created_at: string
}
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'เมื่อกี้'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diff / 86400)} วันที่แล้ว`
}
function typeIcon(type: NotiType) {
  if (type === 'quiz_submission') return <UserCheck size={16} className="text-blue-600" />
  if (type === 'new_quiz')        return <ClipboardList size={16} className="text-violet-600" />
  if (type === 'new_appointment') return <Calendar size={16} className="text-indigo-600" />
  return <Megaphone size={16} className="text-amber-500" />
}
function typeBg(type: NotiType) {
  if (type === 'quiz_submission') return 'bg-blue-50'
  if (type === 'new_quiz')        return 'bg-violet-50'
  if (type === 'new_appointment') return 'bg-indigo-50'
  return 'bg-amber-50'
}
function typeLabel(type: NotiType) {
  if (type === 'quiz_submission') return { text: 'ส่งข้อสอบ',    cls: 'text-blue-700' }
  if (type === 'new_quiz')        return { text: 'แบบทดสอบใหม่', cls: 'text-violet-700' }
  if (type === 'new_appointment') return { text: 'วันนัดหมาย',   cls: 'text-indigo-700' }
  return                                  { text: 'ประกาศ',       cls: 'text-amber-700' }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function NotiModal({ noti, onClose }: { noti: Notification; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc) }
  }, [onClose])

  const isSub  = noti.type === 'quiz_submission'
  const isQuiz = noti.type === 'new_quiz'
  const isAnn  = noti.type === 'new_announcement'
  const isAppt = noti.type === 'new_appointment'
  const lbl    = typeLabel(noti.type)
  const score    = noti.metadata?.score    as number  | null | undefined
  const isPassed = noti.metadata?.is_passed as boolean | undefined
  const student  = noti.metadata?.student_name as string | undefined

  if (!mounted) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-[10000] bottom-0 left-0 right-0 flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:bottom-auto sm:right-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        style={{ maxHeight: 'min(85dvh,85vh)', minHeight: 0 }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${typeBg(noti.type)}`}>
            {typeIcon(noti.type)}<span className={lbl.cls}>{lbl.text}</span>
          </div>
          <h2 className="mb-2 pr-8 text-lg font-extrabold leading-snug text-slate-800">{noti.title}</h2>
          {noti.body && <p className="mb-4 text-sm leading-relaxed text-slate-500">{noti.body}</p>}
          {isSub && (
            <div className="mb-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              {student && <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">นักเรียน</span><span className="font-bold text-slate-800">{student}</span></div>}
              {score != null && <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">คะแนน</span><span className={`text-xl font-extrabold ${score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score.toFixed(1)}%</span></div>}
              {isPassed !== undefined && <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">ผลการสอบ</span><span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{isPassed ? 'ผ่าน ✓' : 'ไม่ผ่าน ✗'}</span></div>}
            </div>
          )}
          {isAppt && (
            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-indigo-700 font-bold">
                <Calendar size={14} />
                <span>วันนัดหมายใหม่</span>
              </div>
              {noti.body && (
                <p className="text-sm text-indigo-600 font-medium">{noti.body}</p>
              )}
            </div>
          )}
          <p className="mb-5 text-xs text-slate-400">{timeAgo(noti.created_at)}</p>
          <div className="flex flex-col gap-2">
            {isQuiz && noti.link && <Link href={noti.link} onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"><ClipboardList size={16} />ไปทำแบบทดสอบ<ChevronRight size={14} className="opacity-70" /></Link>}
            {isAnn && noti.link && <Link href={noti.link} onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 active:scale-95"><Megaphone size={16} />ดูประกาศทั้งหมด<ChevronRight size={14} className="opacity-70" /></Link>}
            {isAppt && noti.link && <Link href={noti.link} onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"><Calendar size={16} />ดูปฏิทินนัดหมาย<ChevronRight size={14} className="opacity-70" /></Link>}
            {isSub && <Link href="/dashboard/admin/submissions" onClick={onClose} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 active:scale-95">ดูประวัติการสอบทั้งหมด<ChevronRight size={14} className="opacity-60" /></Link>}
            <button onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">ปิด</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open,     setOpen]     = useState(false)
  const [notis,    setNotis]    = useState<Notification[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<Notification | null>(null)
  const [error,    setError]    = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const unread  = notis.filter((n) => !n.is_read).length

  const fetchNotis = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) { setError(true); return }
      const json = await res.json()
      if (Array.isArray(json.notifications)) setNotis(json.notifications)
    } catch { setError(true) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchNotis()
    const id = setInterval(fetchNotis, 30_000)
    return () => clearInterval(id)
  }, [fetchNotis])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    setNotis((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
  }
  const deleteAll = async () => {
    setNotis([])
    await fetch('/api/notifications/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
  }
  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotis((prev) => prev.filter((n) => n.id !== id))
    await fetch('/api/notifications/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }
  const openModal = async (n: Notification) => {
    setSelected(n); setOpen(false)
    if (!n.is_read) {
      setNotis((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
    }
  }

  return (
    <>
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => { setOpen((o) => !o); if (!open) fetchNotis() }}
          title="การแจ้งเตือน"
          className={`relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors ${open ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50 hover:text-blue-600'}`}
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-[100] mt-2 flex w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
            style={{ maxHeight: 'min(480px,80dvh)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-blue-600" />
                <span className="text-sm font-extrabold text-slate-700">การแจ้งเตือน</span>
                {unread > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600">{unread} ใหม่</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-blue-600">
                    <CheckCheck size={12} />อ่านทั้งหมด
                  </button>
                )}
                {notis.length > 0 && (
                  <button onClick={deleteAll} title="ลบทั้งหมด" className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto">
              {loading && notis.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                  <span className="text-xs">กำลังโหลด...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                  <Bell size={28} strokeWidth={1.5} />
                  <span className="text-xs">ยังไม่ได้ตั้งค่าระบบแจ้งเตือน</span>
                  <span className="text-[10px] text-slate-300">รัน notifications.sql ใน Supabase ก่อน</span>
                </div>
              ) : notis.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                  <Inbox size={32} strokeWidth={1.5} />
                  <span className="text-xs font-medium">ยังไม่มีการแจ้งเตือน</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {notis.map((n) => (
                    <li key={n.id} className="group relative">
                      <button
                        onClick={() => openModal(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3.5 pr-9 text-left transition hover:bg-slate-50 active:bg-slate-100 ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${typeBg(n.type)}`}>
                          {typeIcon(n.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${!n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{n.body}</p>}
                          <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                      </button>
                      <button
                        onClick={(e) => deleteOne(n.id, e)}
                        title="ลบ"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && <NotiModal noti={selected} onClose={() => setSelected(null)} />}
    </>
  )
}