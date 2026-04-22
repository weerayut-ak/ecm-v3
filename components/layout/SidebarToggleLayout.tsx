'use client'
import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

interface Profile { id: string; full_name: string; nickname?: string | null; role: string; grade?: string | null }

export default function SidebarToggleLayout({ profile, children }: { profile: Profile | null; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Desktop sidebar - togglable */}
      <div
        className="sidebar-desktop"
        style={{
          width: sidebarOpen ? 'var(--sidebar-w, 288px)' : 0,
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
          flexShrink: 0,
        }}
      >
        <Sidebar profile={profile} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar profile={profile} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', WebkitOverflowScrolling: 'touch' }}>
          <div className="fade-up">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav profile={profile} />
    </div>
  )
}
