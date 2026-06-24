import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { Extra } from '@/types'

export const DEFAULT_EXTRAS: Extra[] = [
  { id: 'cleaning', name: 'Ménage final', price: 80 },
  { id: 'chef', name: 'Chef cuisine', price: 150 },
  { id: 'airport', name: 'Transfert aéroport', price: 50 },
]

interface ExtrasState {
  extras: Extra[]
  loading: boolean
  fetch: () => Promise<void>
  save: (extras: Extra[]) => Promise<void>
}

export const useExtrasStore = create<ExtrasState>()((set) => ({
  extras: DEFAULT_EXTRAS,
  loading: false,

  fetch: async () => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    if (isDemoMode || !tenant) return
    set({ loading: true })
    const { data } = await supabase.from('tenants').select('extras_config').eq('id', tenant.id).single()
    if (data?.extras_config && Array.isArray(data.extras_config) && data.extras_config.length > 0) {
      set({ extras: data.extras_config as Extra[] })
    }
    set({ loading: false })
  },

  save: async (extras) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    if (!isDemoMode && tenant) {
      await supabase.from('tenants').update({ extras_config: extras }).eq('id', tenant.id)
    }
    set({ extras })
  },
}))
