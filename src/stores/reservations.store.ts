import { create } from 'zustand'
import type { Reservation, Client } from '@/types'

type NewClientPayload = { full_name: string; email: string | null; phone: string | null; nationality: string | null; passport_number?: string | null }
type AddReservationPayload = Omit<Reservation, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'client' | 'villa'> & { client?: NewClientPayload }
import { DEMO_RESERVATIONS, DEMO_CLIENTS, DEMO_VILLAS, enrichReservations } from '@/lib/demo-data'
import { useAuthStore } from './auth.store'
import { supabase } from '@/lib/supabase'
import { parseISO, areIntervalsOverlapping } from 'date-fns'

interface ReservationsState {
  reservations: Reservation[]
  archived: Reservation[]
  clients: Client[]
  loading: boolean
  fetch: () => Promise<void>
  fetchArchived: () => Promise<void>
  add: (res: AddReservationPayload) => Promise<Reservation>
  update: (id: string, patch: Partial<Reservation>) => Promise<void>
  remove: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  checkConflict: (villaId: string, checkIn: string, checkOut: string, excludeId?: string) => boolean
}

export const useReservationsStore = create<ReservationsState>()((set, get) => ({
  reservations: [],
  archived: [],
  clients: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    set({ loading: true })
    if (isDemoMode) {
      set({
        reservations: enrichReservations(DEMO_RESERVATIONS, DEMO_VILLAS, DEMO_CLIENTS),
        clients: DEMO_CLIENTS,
        loading: false,
      })
      return
    }
    const [{ data: res, error: resErr }, { data: cli }] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, villa:villas(*), client:clients(*)')
        .order('check_in'),
      supabase.from('clients').select('*').order('full_name'),
    ])
    if (resErr) {
      console.error('[reservations.fetch]', resErr.message)
      set({ loading: false })
      return
    }
    // Filter out archived client-side — works whether or not archived_at column exists yet
    const active = (res ?? []).filter(r => !r.archived_at)
    set({ reservations: active, clients: cli ?? [], loading: false })
  },

  fetchArchived: async () => {
    const { isDemoMode } = useAuthStore.getState()
    if (isDemoMode) { set({ archived: [] }); return }
    const { data, error } = await supabase
      .from('reservations')
      .select('*, villa:villas(*), client:clients(*)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
    if (error) throw error
    set({ archived: data ?? [] })
  },

  checkConflict: (villaId, checkIn, checkOut, excludeId) => {
    const { reservations } = get()
    return reservations.some(r =>
      r.id !== excludeId &&
      r.villa_id === villaId &&
      r.status !== 'cancelled' &&
      areIntervalsOverlapping(
        { start: parseISO(checkIn), end: parseISO(checkOut) },
        { start: parseISO(r.check_in), end: parseISO(r.check_out) },
        { inclusive: false }
      )
    )
  },

  add: async (payload: AddReservationPayload) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    const { client: clientPayload, ...resData } = payload
    const newRes: Reservation = {
      ...resData,
      id: crypto.randomUUID(),
      tenant_id: tenant?.id ?? 'demo-tenant-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (isDemoMode) {
      const villas = DEMO_VILLAS
      const clients = get().clients
      const enriched = enrichReservations([newRes], villas, clients)[0]
      set(s => ({ reservations: [...s.reservations, enriched] }))
      return enriched
    }
    let clientId = resData.client_id
    if (clientPayload?.full_name && !clientId) {
      const { data: cli } = await supabase.from('clients').insert({
        ...clientPayload,
        tenant_id: tenant?.id,
      }).select().single()
      clientId = cli?.id ?? null
    }
    const { data, error } = await supabase.from('reservations').insert({ ...newRes, client_id: clientId }).select('*, villa:villas(*), client:clients(*)').single()
    if (error) throw error
    set(s => ({ reservations: [...s.reservations, data] }))
    return data
  },

  update: async (id, patch) => {
    const { isDemoMode } = useAuthStore.getState()
    const updated = { ...patch, updated_at: new Date().toISOString() }
    if (!isDemoMode) await supabase.from('reservations').update(updated).eq('id', id)
    set(s => ({ reservations: s.reservations.map(r => r.id === id ? { ...r, ...updated } : r) }))
  },

  // Archive instead of hard-delete
  remove: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    const archived_at = new Date().toISOString()
    if (!isDemoMode) {
      const { error } = await supabase
        .from('reservations')
        .update({ archived_at })
        .eq('id', id)
      if (error) throw error  // Do NOT update local state if DB update failed
    }
    set(s => ({ reservations: s.reservations.filter(r => r.id !== id) }))
  },

  restore: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) {
      const { error } = await supabase
        .from('reservations')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
    }
    const { archived, reservations } = get()
    const res = archived.find(r => r.id === id)
    if (res) {
      const restored = { ...res, archived_at: null }
      set({
        archived: archived.filter(r => r.id !== id),
        reservations: [...reservations, restored].sort((a, b) => a.check_in.localeCompare(b.check_in)),
      })
    }
  },
}))
