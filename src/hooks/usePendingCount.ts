import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export function usePendingCount() {
  const { profile, isDemoMode } = useAuthStore()
  const [count, setCount] = useState(0)

  async function refresh() {
    if (isDemoMode || !profile) return
    const { count: c } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setCount(c ?? 0)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [profile?.tenant_id, isDemoMode])

  return count
}
