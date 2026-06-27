import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import '@/i18n'

import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import PlansPage from '@/pages/PlansPage'
import PaymentSuccessPage from '@/pages/PaymentSuccessPage'
import BlacklistPage from '@/pages/BlacklistPage'
import AdminPage from '@/pages/AdminPage'
import DashboardPage from '@/pages/DashboardPage'
import VillasPage from '@/pages/VillasPage'
import CalendarPage from '@/pages/CalendarPage'
import ReservationsPage from '@/pages/ReservationsPage'
import TeamPage from '@/pages/TeamPage'
import PricingPage from '@/pages/PricingPage'
import CommunicationsPage from '@/pages/CommunicationsPage'
import SettingsPage from '@/pages/SettingsPage'
import SubscriptionPage from '@/pages/SubscriptionPage'
import BookingPage from '@/pages/BookingPage'
import HomePage from '@/pages/HomePage'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'prokmbconsulting@gmail.com'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setSessionChecked(true)
    })
  }, [])

  // Profile already in store (persisted or just logged in) → pass through
  if (profile) return <>{children}</>
  // Waiting for session check → show nothing briefly
  if (!sessionChecked) return null
  // No session at all → redirect to login
  if (!hasSession) return <Navigate to="/login" replace />
  // Session exists but profile not yet in store → wait for onAuthStateChange
  return null
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore()
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setChecked(true)
    })
  }, [])

  if (!profile) return <Navigate to="/login" replace />
  if (!checked) return null
  if (email !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const { profile: currentProfile, isDemoMode, setProfile, setTenant, logout } = useAuthStore.getState()
        if (isDemoMode) return

        if (!session) {
          logout()
          return
        }

        // Session detected but store empty → initialize (magic link, invite, page refresh)
        if (currentProfile) return
        const { data: p } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single()
        if (!p) return
        setProfile(p)
        const { data: t } = await supabase
          .from('tenants').select('*').eq('id', p.tenant_id).single()
        if (t) setTenant(t)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '0.875rem', maxWidth: '360px' },
        }}
      />
      <Routes>
        {/* Landing */}
        <Route path="/" element={<HomePage />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/booking" element={<BookingPage />} />

        {/* Admin only */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/villas"          element={<VillasPage />} />
          <Route path="/calendar"        element={<CalendarPage />} />
          <Route path="/reservations"    element={<ReservationsPage />} />
          <Route path="/team"            element={<TeamPage />} />
          <Route path="/pricing"         element={<PricingPage />} />
          <Route path="/communications"  element={<CommunicationsPage />} />
          <Route path="/blacklist"       element={<BlacklistPage />} />
          <Route path="/settings"        element={<SettingsPage />} />
          <Route path="/subscription"    element={<SubscriptionPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
