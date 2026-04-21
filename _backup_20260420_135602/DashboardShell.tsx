'use client'
import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

interface Profile { id: string; full_name: string; nickname?: string | null; role: string; grade?: string | null }

export default function DashboardShell({ profile }: { profile: Profile | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Topbar profile={profile} onMenuClick={() => setSidebarOpen(o => !o)} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - desktop only, toggle ด้วยปุ่ม 3 ขีด */}
        <div className="sidebar-desktop" style={{
          width: sidebarOpen ? 220 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          flexShrink: 0,
        }}>
          <Sidebar profile={profile} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', WebkitOverflowScrolling: 'touch' }}>
          <div className="fade-up">
            {/* children ต้องส่งผ่าน props */}
          </div>
        </main>
      </div>

      <MobileNav profile={profile} />
    </div>
  )
}