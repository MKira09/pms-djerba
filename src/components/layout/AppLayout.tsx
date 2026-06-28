import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

export default function AppLayout() {
  const { profile, isDemoMode, setTenant } = useAuthStore()

  // Re-fetch tenant on mount to pick up any new columns (e.g. property_types)
  // that may be missing from the cached localStorage version.
  useEffect(() => {
    if (isDemoMode || !profile?.tenant_id) return
    supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()
      .then(({ data }) => { if (data) setTenant(data) })
  }, [])

  return (
    <div className="flex h-screen bg-sable overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
