import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'
import PushPermissionBanner from '@/components/notifications/PushPermissionBanner'
import BrandStyle from '@/components/brand/BrandStyle'
import ProductTour, { hasSeenTour } from '@/components/onboarding/ProductTour'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

export default function AppLayout() {
  const { profile, isDemoMode, setTenant, tenant } = useAuthStore()
  const location = useLocation()
  const [showTour, setShowTour] = useState(false)

  // Déclenchée explicitement depuis OnboardingPage (state.startTour) à la
  // fin du parcours d'accueil — jamais relancée une fois vue (flag localStorage).
  useEffect(() => {
    const wantsTour = (location.state as { startTour?: boolean } | null)?.startTour
    if (wantsTour && !isDemoMode && !hasSeenTour(profile?.id)) {
      setShowTour(true)
    }
  }, [location.state, isDemoMode, profile?.id])

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
      <BrandStyle
        primary={tenant?.brand_color_primary}
        secondary={tenant?.brand_color_secondary}
        font={tenant?.brand_font}
      />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <PushPermissionBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      {showTour && <ProductTour onDone={() => setShowTour(false)} />}
    </div>
  )
}
