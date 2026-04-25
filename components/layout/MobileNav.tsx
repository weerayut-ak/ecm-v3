'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Megaphone, ClipboardList, User, Menu, X } from 'lucide-react'

interface Profile { role: string }

const TABS = [
  { href: '/dashboard',           label: 'หลัก',    icon: LayoutDashboard },
  { href: '/dashboard/media',     label: 'สื่อ',    icon: BookOpen },
  { href: '/dashboard/announcements', label: 'ประกาศ', icon: Megaphone },
  { href: '/dashboard/quizzes',   label: 'ควิซ',    icon: ClipboardList },
  { href: '/dashboard/profile',   label: 'โปรไฟล์', icon: User },
]

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  
  // State สำหรับควบคุมการกางออก/หดเข้าของเมนูในหน้าข้อสอบ
  const [isExpanded, setIsExpanded] = useState(false)
  
  // ฟังก์ชันเช็คว่าหน้าปัจจุบันตรงกับ Tab หรือไม่
  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  // ตรวจสอบว่ากำลังอยู่ในหน้า "ทำข้อสอบ" หรือไม่
  const isExamPage = (pathname.includes('/quizzes/') && pathname !== '/dashboard/quizzes') || pathname.includes('/exam')

  // เมื่อเปลี่ยนหน้า ให้รีเซ็ตสถานะเป็นหดเมนูเสมอ (ถ้าเป็นหน้าข้อสอบ)
  useEffect(() => {
    setIsExpanded(false)
  }, [pathname])

  // เมนูหลักจะโชว์ก็ต่อเมื่อ: ไม่ใช่หน้าข้อสอบ หรือ กดขยายเมนูแล้ว
  const showFullNav = !isExamPage || isExpanded

  return (
    <>
      {/* เพิ่ม .mobile-nav-fab เพื่อซ่อนปุ่มวงกลมบน Desktop ด้วย */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-nav, .mobile-nav-fab {
            display: none !important;
          }
        }
      `}</style>

      {/* ปุ่มวงกลมที่จะโผล่มาเฉพาะตอนทำข้อสอบ */}
      <button 
        className="mobile-nav-fab"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'fixed',
          // ถ้าเมนูกางอยู่ ให้ปุ่มเด้งหลบขึ้นไปด้านบนนิดนึง
          bottom: (isExamPage && isExpanded) ? '84px' : '24px',
          right: '16px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#0052FF',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          boxShadow: '0 8px 24px rgba(0, 82, 255, 0.4)',
          border: 'none',
          cursor: 'pointer',
          // ซ่อนปุ่มถ้าไม่ใช่หน้าข้อสอบ
          opacity: isExamPage ? 1 : 0,
          transform: isExamPage ? 'scale(1)' : 'scale(0)',
          pointerEvents: isExamPage ? 'auto' : 'none',
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
        }}
      >
        {/* แอนิเมชันสลับ Icon ระหว่าง ขีดสามขีด (Menu) กับ กากบาท (X) */}
        <div style={{ position: 'absolute', transition: 'all 0.3s', opacity: isExpanded ? 0 : 1, transform: isExpanded ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)' }}>
          <Menu size={24} strokeWidth={2.5} />
        </div>
        <div style={{ position: 'absolute', transition: 'all 0.3s', opacity: isExpanded ? 1 : 0, transform: isExpanded ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)' }}>
          <X size={24} strokeWidth={2.5} />
        </div>
      </button>

      {/* แถบเมนูหลัก */}
      <nav className="mobile-nav" style={{
        position: 'fixed', 
        bottom: '24px', 
        left: '16px', 
        right: '16px', 
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0052FF',
        borderRadius: '100px',
        padding: '8px 12px',
        boxShadow: '0 8px 32px rgba(0, 82, 255, 0.4)',
        
        // --- แอนิเมชันตอนยุบ/ขยาย ---
        // จุดกำเนิดการย่อส่วนให้อยู่ฝั่งขวา (เพื่อให้ดูดเข้าปุ่มวงกลม)
        transformOrigin: 'calc(100% - 14px) center', 
        // ถ้ายุบ ให้สเกลเล็กลงและโปร่งใส
        transform: showFullNav ? 'scale(1)' : 'scale(0.1)',
        opacity: showFullNav ? 1 : 0, 
        pointerEvents: showFullNav ? 'auto' : 'none', 
        transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)', 
        // ------------------------------------------------
      }}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: active ? '0 24px' : '0 10px',
              height: '44px',
              borderRadius: '100px', 
              textDecoration: 'none',
              color: active ? '#0052FF' : 'rgba(255, 255, 255, 0.7)',
              background: active ? '#FFFFFF' : 'transparent',
              transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)', 
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                maxWidth: active ? '0px' : '24px',
                opacity: active ? 0 : 1,
                transform: active ? 'scale(0.5)' : 'scale(1)',
                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
              }}>
                <Icon size={24} strokeWidth={2} />
              </div>
              
              <span style={{
                overflow: 'hidden', 
                maxWidth: active ? '100px' : '0px',
                opacity: active ? 1 : 0,
                fontSize: '15px', 
                fontWeight: 700, 
                whiteSpace: 'nowrap', 
                transform: active ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}