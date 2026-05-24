// app/dashboard/admin/appointments/page.tsx
import { createClient } from '@/lib/supabase/server'
import AppointmentManagerClient from '@/components/admin/AppointmentManagerClient'

export default async function AppointmentsAdminPage() {
  const supabase = await createClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">จัดการวันนัดหมาย</h1>
        <p className="text-gray-400 text-sm mt-0.5">เพิ่ม แก้ไข และลบวันนัดหมาย พร้อมแจ้งเตือนนักเรียนอัตโนมัติ</p>
      </div>
      <AppointmentManagerClient initialAppointments={appointments ?? []} />
    </div>
  )
}