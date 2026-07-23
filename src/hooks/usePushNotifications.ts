import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

// Computed synchronously at call time — no state, no effect, no first-render null flash.
function detectSupport(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window
}

export function usePushNotifications() {
  const { profile, isDemoMode } = useAuthStore()
  // Both values are read synchronously: banner shows on first render if conditions are met.
  const isSupported = detectSupport()
  const [permission, setPermission] = useState<NotificationPermission>(
    () => isSupported ? Notification.permission : 'denied'
  )

  async function subscribeInternal(): Promise<boolean> {
    if (!profile || !VAPID_PUBLIC_KEY) return false
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await supabase.from('push_subscriptions').upsert({
        profile_id: profile.id,
        tenant_id: profile.tenant_id,
        endpoint: sub.endpoint,
        subscription: sub.toJSON(),
      }, { onConflict: 'profile_id,endpoint' })
      return true
    } catch (err) {
      console.error('[push] subscription error:', err)
      return false
    }
  }

  async function requestPermission(): Promise<NotificationPermission> {
    if (isDemoMode || !isSupported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') await subscribeInternal()
    return result
  }

  return { isSupported, permission, requestPermission }
}
