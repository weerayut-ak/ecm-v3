import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isConfigured = supabaseUrl.length > 0 && !supabaseUrl.includes('placeholder')
  let profile = null

  if (isConfigured) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const { redirect } = await import('next/navigation')
        redirect('/login')
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      profile = data
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('NEXT_REDIRECT')) throw e
    }
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="sidebar-desktop">
        <Sidebar profile={profile} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar profile={profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', WebkitOverflowScrolling: 'touch' }}>
          <div className="fade-up">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav profile={profile} />
    </div>
  )
}
