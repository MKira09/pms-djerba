import { create } from 'zustand'
import type { SeasonalRate } from '@/types'
import { DEMO_SEASONAL_RATES } from '@/lib/demo-data'
import { useAuthStore } from './auth.store'
import { supabase } from '@/lib/supabase'
import { parseISO, isWithinInterval } from 'date-fns'

interface PricingState {
  rates: SeasonalRate[]
  loading: boolean
  fetch: () => Promise<void>
  add: (r: Omit<SeasonalRate, 'id' | 'tenant_id' | 'created_at'>) => Promise<void>
  update: (id: string, patch: Partial<SeasonalRate>) => Promise<void>
  remove: (id: string) => Promise<void>
  computePrice: (basePrice: number, date: Date) => number
}

export const usePricingStore = create<PricingState>()((set, get) => ({
  rates: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    set({ loading: true })
    if (isDemoMode) { set({ rates: DEMO_SEASONAL_RATES, loading: false }); return }
    const { data } = await supabase.from('seasonal_rates').select('*').order('start_date')
    set({ rates: data ?? [], loading: false })
  },

  add: async (r) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    const newRate: SeasonalRate = { ...r, id: crypto.randomUUID(), tenant_id: tenant?.id ?? 'demo-tenant-1', created_at: new Date().toISOString() }
    if (!isDemoMode) await supabase.from('seasonal_rates').insert(newRate)
    set(s => ({ rates: [...s.rates, newRate] }))
  },

  update: async (id, patch) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('seasonal_rates').update(patch).eq('id', id)
    set(s => ({ rates: s.rates.map(r => r.id === id ? { ...r, ...patch } : r) }))
  },

  remove: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('seasonal_rates').delete().eq('id', id)
    set(s => ({ rates: s.rates.filter(r => r.id !== id) }))
  },

  computePrice: (basePrice, date) => {
    const { rates } = get()
    const matching = rates
      .filter(r => {
        try {
          return isWithinInterval(date, { start: parseISO(r.start_date), end: parseISO(r.end_date) })
        } catch { return false }
      })
      .sort((a, b) => b.multiplier - a.multiplier)
    const multiplier = matching.length > 0 ? matching[0].multiplier : 1
    return Math.round(basePrice * multiplier)
  },
}))
