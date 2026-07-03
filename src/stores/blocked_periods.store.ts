import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth.store'
import type { BlockedPeriod, BlockedReason } from '@/types'
import { parseISO, areIntervalsOverlapping } from 'date-fns'

type AddPayload = {
  villa_id: string | null
  start_date: string
  end_date: string
  start_time?: string | null
  end_time?: string | null
  reason: BlockedReason
  note?: string
}

interface BlockedPeriodsState {
  periods: BlockedPeriod[]
  loading: boolean
  fetch: () => Promise<void>
  add: (data: AddPayload) => Promise<void>
  remove: (id: string) => Promise<void>
  isBlocked: (villaId: string, date: Date) => BlockedPeriod | null
}

export const useBlockedPeriodsStore = create<BlockedPeriodsState>()((set, get) => ({
  periods: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    set({ loading: true })
    if (isDemoMode) { set({ periods: [], loading: false }); return }
    const { data } = await supabase
      .from('blocked_periods')
      .select('*')
      .order('start_date')
    set({ periods: data ?? [], loading: false })
  },

  add: async (data) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    if (!tenant) return
    if (isDemoMode) {
      const fake: BlockedPeriod = {
        id: crypto.randomUUID(), tenant_id: tenant.id, created_at: new Date().toISOString(),
        note: data.note ?? null, start_time: data.start_time ?? null, end_time: data.end_time ?? null, ...data,
      }
      set(s => ({ periods: [...s.periods, fake] }))
      return
    }
    const { data: row, error } = await supabase
      .from('blocked_periods')
      .insert({ ...data, tenant_id: tenant.id })
      .select()
      .single()
    if (error) throw error
    set(s => ({ periods: [...s.periods, row] }))
  },

  remove: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('blocked_periods').delete().eq('id', id)
    set(s => ({ periods: s.periods.filter(p => p.id !== id) }))
  },

  isBlocked: (villaId, date) => {
    const { periods } = get()
    return periods.find(p =>
      (p.villa_id === null || p.villa_id === villaId) &&
      areIntervalsOverlapping(
        { start: date, end: date },
        { start: parseISO(p.start_date), end: parseISO(p.end_date) },
        { inclusive: true }
      )
    ) ?? null
  },
}))
