'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Settings, Menu, Users, BarChart2, Scan, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLogo from '@/components/ui/AppLogo'

interface Profile {
  full_name: string
  nickname?: string | null
  role: string
}

const ADMIN_NAV = [
  { href: '/dashboard/students', label: 'นักเรียน', icon: Users },
  { href: '/dashboard/admin', label: 'Admin Panel', icon: Settings },
  { href: '/dashboard/admin/submissions', label: 'ประวัติสอบ', icon: BarChart2 },
  { href: '/under-construction', label: 'OMR Scanner', icon: Scan },
]

export default function Topbar({
  profile,
  onMenuClick,
}: {
  profile: Profile | null
  onMenuClick?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const supabase = createClient()

  // States
  const [semester, setSemester] = useState('1/2568')
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('1/2568')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  // Ref สำหรับจัดการ Click Outside
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 1. ดึงข้อมูลเทอมตอนโหลดคอมโพเนนต์
  useEffect(() => {
    const fetchSemester = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'semester')
        .single()

      if (data?.value && !error) {
        setSemester(data.value)
        setEditVal(data.value)
      }
    }
    fetchSemester()
  }, [supabase])

  // 2. ปิดเมนูเมื่อเปลี่ยนหน้า หรือคลิกพื้นที่อื่น
  useEffect(() => {
    setAdminMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false)
      }
    }
    if (adminMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [adminMenuOpen])

  // 3. บันทึกภาคเรียน
  const saveSemester = async () => {
    if (!editVal.trim()) return setEditing(false)
    
    await supabase
      .from('app_settings')
      .upsert({ key: 'semester', value: editVal }, { onConflict: 'key' })
    
    setSemester(editVal)
    setEditing(false)
  }

  // Helper function
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-[#f9f9ff]/90 px-4 shadow-[0_4px_20px_rgba(20,27,43,0.05)] backdrop-blur-xl">
      
      {/* ฝั่งซ้าย: โลโก้ และปุ่ม Hamburger */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={onMenuClick}
          title="เปิด/ปิดเมนู"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 md:flex"
        >
          <Menu size={20} />
        </button>
        <AppLogo showName size={30} style={{ minWidth: 0 }} />
      </div>

      {/* ฝั่งขวา: เครื่องมือต่างๆ */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        
        {/* จัดการภาคเรียน (เฉพาะแอดมิน) */}
        <div className="hidden md:block">
          {editing && isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">ภาคเรียน</span>
              <input
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSemester()
                  if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
                className="w-16 rounded-md border-2 border-blue-600 bg-white px-2 py-1 text-xs font-bold text-blue-600 outline-none"
              />
              <button
                onClick={saveSemester}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
              >
                บันทึก
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              onClick={() => isAdmin && setEditing(true)}
              disabled={!isAdmin}
              title={isAdmin ? 'คลิกเพื่อแก้ไขภาคเรียน' : ''}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors ${
                isAdmin ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'
              }`}
            >
              ภาคเรียน {semester}
              {isAdmin && <Edit2 size={10} className="opacity-50" />}
            </button>
          )}
        </div>

        {/* ปุ่ม Admin Dropdown (แสดงผลบนมือถือ/แท็บเล็ต) */}
        {isAdmin && (
          <div className="relative md:hidden" ref={dropdownRef}>
            <button
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              title="จัดการ"
              className={`flex h-9 w-9 items-center justify-center rounded-full text-blue-600 transition-all ${
                adminMenuOpen ? 'bg-blue-50' : 'bg-transparent hover:bg-blue-50'
              }`}
            >
              <Settings size={18} />
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute right-0 top-full mt-2 flex w-56 flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl transition-all duration-200 ${
                adminMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
              }`}
            >
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                จัดการ
              </div>
              
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                const isPill = label === 'Admin Panel'

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      isPill
                        ? 'my-1 rounded-full border border-blue-600 bg-white text-blue-600 shadow-sm hover:bg-blue-50'
                        : active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active || isPill ? 2.5 : 2}
                      className={isPill || active ? 'text-blue-600' : 'text-slate-400'}
                    />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ปุ่มกระดิ่งแจ้งเตือน */}
        <button
          onClick={() => router.push('/under-construction')}
          title="การแจ้งเตือน"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-blue-50 sm:flex"
        >
          <Bell size={18} />
        </button>

        {/* Avatar รูปโปรไฟล์ */}
        <Link href="https://www.facebook.com/love.esthers" target="_blank">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 shadow-md transition-transform hover:scale-105">
            <Image
              src="/facebook.png"
              alt="Facebook Profile"
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
        </Link>
      </div>
    </header>
  )
}