import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISS_KEY = 'push_banner_dismissed'

export default function PushPermissionBanner() {
  const { isDemoMode } = useAuthStore()
  const { isSupported, permission, requestPermission } = usePushNotifications()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY))
  const [loading, setLoading] = useState(false)

  if (!isSupported || permission !== 'default' || dismissed || isDemoMode) return null

  async function handleEnable() {
    setLoading(true)
    await requestPermission()
    setLoading(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div data-push-banner className="flex items-center gap-3 bg-brand-800 text-white px-4 py-3 shrink-0">
      <Bell className="h-4 w-4 shrink-0 text-brand-200" />
      <p className="text-sm flex-1">
        Recevez une alerte instantanée sur cet appareil à chaque nouvelle demande de réservation.
      </p>
      <button
        onClick={handleEnable}
        disabled={loading}
        className="text-xs font-semibold bg-white text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-60"
      >
        {loading ? '…' : 'Activer'}
      </button>
      <button onClick={handleDismiss} className="p-1 text-brand-300 hover:text-white transition-colors shrink-0" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
