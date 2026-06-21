import { create } from 'zustand'
import type { Villa } from '@/types'
import { DEMO_VILLAS } from '@/lib/demo-data'
import { useAuthStore } from './auth.store'
import { supabase } from '@/lib/supabase'

interface VillasState {
  villas: Villa[]
  loading: boolean
  fetch: () => Promise<void>
  add: (villa: Omit<Villa, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<Villa>
  update: (id: string, patch: Partial<Villa>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useVillasStore = create<VillasState>()((set) => ({
  villas: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    set({ loading: true })
    if (isDemoMode) {
      set({ villas: DEMO_VILLAS, loading: false })
      return
    }
    const { data } = await supabase.from('villas').select('*').order('name')
    set({ villas: data ?? [], loading: false })
  },

  add: async (villa) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    const newVilla: Villa = {
      ...villa,
      id: crypto.randomUUID(),
      tenant_id: tenant?.id ?? 'demo-tenant-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (isDemoMode) {
      set(s => ({ villas: [...s.villas, newVilla] }))
      return newVilla
    }
    const { data, error } = await supabase.from('villas').insert(newVilla).select().single()
    if (error) throw error
    set(s => ({ villas: [...s.villas, data] }))
    return data
  },

  update: async (id, patch) => {
    const { isDemoMode } = useAuthStore.getState()
    const updated = { ...patch, updated_at: new Date().toISOString() }
    if (isDemoMode) {
      set(s => ({ villas: s.villas.map(v => v.id === id ? { ...v, ...updated } : v) }))
      return
    }
    await supabase.from('villas').update(updated).eq('id', id)
    set(s => ({ villas: s.villas.map(v => v.id === id ? { ...v, ...updated } : v) }))
  },

  remove: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('villas').delete().eq('id', id)
    set(s => ({ villas: s.villas.filter(v => v.id !== id) }))
  },
}))
