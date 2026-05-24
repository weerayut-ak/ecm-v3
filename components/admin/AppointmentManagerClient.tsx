'use client'
// components/admin/AppointmentManagerClient.tsx

import { useState, useTransition } from 'react'
import { Calendar, Clock, MapPin, Plus, Trash2, Bell, Loader2, X, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Appointment {
  id: string
  title: string
  date: string          // 'YYYY-MM-DD'
  time?: string | null
  location?: string | null
  description?: string | null
  created_at?: string
}

interface Props {
  initialAppointments: Appointment[]
}

const EMPTY_FORM = { title: '', date: '', time: '', location: '', description: '' }

export default function AppointmentManagerClient({ initialAppointments }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()
  const [notifyId, setNotifyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── สร้างวันนัดใหม่ ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim() || !form.date) {
      showToast('กรุณากรอกชื่อและวันที่', false)
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          date: form.date,
          time: form.time || null,
          location: form.location || null,
          description: form.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'เกิดข้อผิดพลาด', false); return }
      setAppointments(prev => [...prev, data.appointment].sort((a, b) => a.date.localeCompare(b.date)))
      setForm(EMPTY_FORM)
      setShowForm(false)
      showToast('เพิ่มวันนัดหมายแล้ว 🎉')
    })
  }

  // ── ลบวันนัด ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบวันนัดหมายนี้?')) return
    setDeletingId(id)
    const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) { showToast('ลบไม่สำเร็จ', false); return }
    setAppointments(prev => prev.filter(a => a.id !== id))
    showToast('ลบวันนัดหมายแล้ว')
  }

  // ── ส่งการแจ้งเตือน push ─────────────────────────────────────────────────────
  const handleNotify = async (appt: Appointment) => {
    setNotifyId(appt.id)
    const res = await fetch('/api/appointments/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appt.id }),
    })
    setNotifyId(null)
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'ส่งการแจ้งเตือนไม่สำเร็จ', false); return }
    showToast(`ส่งการแจ้งเตือนถึง ${data.sent ?? 0} อุปกรณ์แล้ว 🔔`)
  }

  const today = new Date().toISOString().split('T')[0]
  const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  const upcomingAppts = appointments.filter(a => a.date >= today)
  const pastAppts = appointments.filter(a => a.date < today)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold animate-in slide-in-from-bottom-2 duration-200 ${
            toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header + add button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>ทั้งหมด {appointments.length} รายการ · กำลังจะมาถึง {upcomingAppts.length} รายการ</span>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-sm transition active:scale-95 shadow-md shadow-indigo-500/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'ยกเลิก' : 'เพิ่มวันนัดหมาย'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> สร้างวันนัดหมายใหม่
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-extrabold text-slate-500 block mb-1">ชื่อวันนัด *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="เช่น ประชุมผู้ปกครอง, สอบกลางภาค"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />วันที่ *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">
                <Clock className="w-3 h-3 inline mr-1" />เวลา (ไม่บังคับ)
              </label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />สถานที่ (ไม่บังคับ)
              </label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="เช่น ห้อง 101, ออนไลน์"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">รายละเอียด (ไม่บังคับ)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="รายละเอียดเพิ่มเติม"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl text-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              บันทึกและแจ้งเตือนนักเรียน
            </button>
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          กำลังจะมาถึง ({upcomingAppts.length})
        </h3>
        {upcomingAppts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400 font-medium">ยังไม่มีวันนัดหมายที่กำลังจะมาถึง</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingAppts.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                formatDate={formatDate}
                isUpcoming
                onDelete={handleDelete}
                onNotify={handleNotify}
                deletingId={deletingId}
                notifyId={notifyId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past appointments */}
      {pastAppts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            ผ่านมาแล้ว ({pastAppts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pastAppts.slice().reverse().map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                formatDate={formatDate}
                isUpcoming={false}
                onDelete={handleDelete}
                onNotify={handleNotify}
                deletingId={deletingId}
                notifyId={notifyId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── sub-component ──────────────────────────────────────────────────────────────
function AppointmentCard({
  appt,
  formatDate,
  isUpcoming,
  onDelete,
  onNotify,
  deletingId,
  notifyId,
}: {
  appt: Appointment
  formatDate: (d: string) => string
  isUpcoming: boolean
  onDelete: (id: string) => void
  onNotify: (a: Appointment) => void
  deletingId: string | null
  notifyId: string | null
}) {
  return (
    <div
      className={`bg-white rounded-2xl border p-4 space-y-3 transition-all ${
        isUpcoming ? 'border-indigo-100 shadow-sm hover:shadow-md' : 'border-slate-100 opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-12 text-center rounded-xl py-1.5 ${
            isUpcoming ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <div className="text-[9px] font-extrabold">
            {new Date(appt.date).toLocaleDateString('th-TH', { month: 'short' })}
          </div>
          <div className="text-xl font-black leading-none">{new Date(appt.date).getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{appt.title}</h4>
          <div className="mt-1 space-y-0.5">
            <p className="text-[11px] text-slate-500 font-bold">{formatDate(appt.date)}</p>
            {appt.time && (
              <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />{appt.time} น.
              </p>
            )}
            {appt.location && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{appt.location}
              </p>
            )}
            {appt.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1">{appt.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {isUpcoming && (
          <button
            onClick={() => onNotify(appt)}
            disabled={notifyId === appt.id}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-xs px-3 py-1.5 rounded-xl transition active:scale-95 disabled:opacity-60"
          >
            {notifyId === appt.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            แจ้งเตือนนักเรียน
          </button>
        )}
        <button
          onClick={() => onDelete(appt.id)}
          disabled={deletingId === appt.id}
          className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold text-xs px-3 py-1.5 rounded-xl transition active:scale-95 disabled:opacity-60"
        >
          {deletingId === appt.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          ลบ
        </button>
      </div>
    </div>
  )
}