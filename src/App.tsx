import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import '@/i18n'

import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore()
  if (!profile) return <Navigate to="/login" replace />
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
        <Route path="/booking" element={<BookingPage />} />

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
