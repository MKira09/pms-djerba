import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { BlacklistEntry } from '@/types'

function normalize(s: string | null | undefined) {
  return (s ?? '').toLowerCase().trim()
}

interface BlacklistState {
  entries: BlacklistEntry[]
  loading: boolean
  fetch: () => Promise<void>
  add: (entry: { full_name: string; phone: string; email: string; reason: string }) => Promise<void>
  remove: (id: string) => Promise<void>
  check: (name: string, phone: string, email: string) => BlacklistEntry | null
}

export const useBlacklistStore = create<BlacklistState>()((set, get) => ({
  entries: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    if (isDemoMode) return
    set({ loading: true })
    const { data } = await supabase.from('blacklist').select('*').order('created_at', { ascending: false })
    set({ entries: data ?? [], loading: false })
  },

  add: async (entry) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    if (isDemoMode) {
      const fake: BlacklistEntry = { ...entry, id: crypto.randomUUID(), tenant_id: 'demo', created_at: new Date().toISOString() }
      set(s => ({ entries: [fake, ...s.entries] }))
      return
    }
    const { data } = await supabase.from('blacklist').insert({ ...entry, tenant_id: tenant?.id }).select().single()
    if (data) set(s => ({ entries: [data, ...s.entries] }))
  },

  remove: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('blacklist').delete().eq('id', id)
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }))
  },

  check: (name, phone, email) => {
    const n = normalize(name)
    const p = normalize(phone)
    const em = normalize(email)
    return get().entries.find(e => {
      if (n && normalize(e.full_name) && normalize(e.full_name) === n) return true
      if (p && normalize(e.phone) && normalize(e.phone) === p) return true
      if (em && normalize(e.email) && normalize(e.email) === em) return true
      return false
    }) ?? null
  },
}))
