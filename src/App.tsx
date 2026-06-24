import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import '@/i18n'

import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import PlansPage from '@/pages/PlansPage'
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
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'prokmbconsulting@gmail.com'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore()
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
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
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/plans" element={<PlansPage />} />
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
          <Route path="/settings"        element={<SettingsPage />} />
          <Route path="/subscription"    element={<SubscriptionPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
