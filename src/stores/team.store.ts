import { create } from 'zustand'
import type { TeamMember, CleaningTask } from '@/types'
import { DEMO_TEAM, DEMO_TASKS, DEMO_VILLAS } from '@/lib/demo-data'
import { useAuthStore } from './auth.store'
import { supabase } from '@/lib/supabase'

interface TeamState {
  members: TeamMember[]
  tasks: CleaningTask[]
  loading: boolean
  fetch: () => Promise<void>
  addMember: (m: Omit<TeamMember, 'id' | 'tenant_id' | 'created_at'>) => Promise<void>
  updateMember: (id: string, patch: Partial<TeamMember>) => Promise<void>
  removeMember: (id: string) => Promise<void>
  addTask: (t: Omit<CleaningTask, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTask: (id: string, patch: Partial<CleaningTask>) => Promise<void>
  removeTask: (id: string) => Promise<void>
}

export const useTeamStore = create<TeamState>()((set) => ({
  members: [],
  tasks: [],
  loading: false,

  fetch: async () => {
    const { isDemoMode } = useAuthStore.getState()
    set({ loading: true })
    if (isDemoMode) {
      const villaMap = Object.fromEntries(DEMO_VILLAS.map(v => [v.id, v]))
      const memberMap = Object.fromEntries(DEMO_TEAM.map(m => [m.id, m]))
      const enrichedTasks = DEMO_TASKS.map(t => ({
        ...t,
        villa: villaMap[t.villa_id],
        assignee: t.assigned_to ? memberMap[t.assigned_to] : undefined,
      }))
      set({ members: DEMO_TEAM, tasks: enrichedTasks, loading: false })
      return
    }
    const [{ data: members }, { data: tasks }] = await Promise.all([
      supabase.from('team_members').select('*').order('full_name'),
      supabase.from('cleaning_tasks').select('*, villa:villas(*), assignee:team_members(*)').order('scheduled_date'),
    ])
    set({ members: members ?? [], tasks: tasks ?? [], loading: false })
  },

  addMember: async (m) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    const newMember: TeamMember = { ...m, id: crypto.randomUUID(), tenant_id: tenant?.id ?? 'demo-tenant-1', created_at: new Date().toISOString() }
    if (!isDemoMode) await supabase.from('team_members').insert(newMember)
    set(s => ({ members: [...s.members, newMember] }))
  },

  updateMember: async (id, patch) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('team_members').update(patch).eq('id', id)
    set(s => ({ members: s.members.map(m => m.id === id ? { ...m, ...patch } : m) }))
  },

  removeMember: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('team_members').delete().eq('id', id)
    set(s => ({ members: s.members.filter(m => m.id !== id) }))
  },

  addTask: async (t) => {
    const { isDemoMode, tenant } = useAuthStore.getState()
    const newTask: CleaningTask = { ...t, id: crypto.randomUUID(), tenant_id: tenant?.id ?? 'demo-tenant-1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (!isDemoMode) await supabase.from('cleaning_tasks').insert(newTask)
    set(s => ({ tasks: [...s.tasks, newTask] }))
  },

  updateTask: async (id, patch) => {
    const { isDemoMode } = useAuthStore.getState()
    const updated = { ...patch, updated_at: new Date().toISOString() }
    if (!isDemoMode) await supabase.from('cleaning_tasks').update(updated).eq('id', id)
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updated } : t) }))
  },

  removeTask: async (id) => {
    const { isDemoMode } = useAuthStore.getState()
    if (!isDemoMode) await supabase.from('cleaning_tasks').delete().eq('id', id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
