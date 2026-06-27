import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { Extra } from '@/types'

export const DEFAULT_EXTRAS: Extra[] = [
  { id: 'cleaning', name: 'Ménage final',        price: 80,  icon: '🧹', enabled: true },
  { id: 'chef',     name: 'Chef cuisine',         price: 150, icon: '👨‍🍳', enabled: true },
  { id: 'airport',  name: 'Transfert aéroport',   price: 50,  icon: '🚗', enabled: true },
]

interface ExtrasState {
  extras: Extra[]
  loading: boolean
  fetch:        () => Promise<void>
  save:         (extras: Extra[]) => Promise<void>
  addExtra:     (data: Omit<Extra, 'id'>) => Promise<void>
  updateExtra:  (id: string, updates: Partial<Omit<Extra, 'id'>>) => Promise<void>
  removeExtra:  (id: string) => Promise<void>
  toggleExtra:  (id: string) => Promise<void>
}

export const useExtrasStore = create<ExtrasState>()((set, get) => ({
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

  addExtra: async (data) => {
    const id = `custom_${Date.now()}`
    const updated = [...get().extras, { id, ...data }]
    await get().save(updated)
  },

  updateExtra: async (id, updates) => {
    const updated = get().extras.map(e => e.id === id ? { ...e, ...updates } : e)
    await get().save(updated)
  },

  removeExtra: async (id) => {
    const updated = get().extras.filter(e => e.id !== id)
    await get().save(updated)
  },

  toggleExtra: async (id) => {
    const updated = get().extras.map(e =>
      e.id === id ? { ...e, enabled: e.enabled === false ? true : false } : e
    )
    await get().save(updated)
  },
}))
