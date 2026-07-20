import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Tenant } from '@/types'

interface AuthState {
  profile: Profile | null
  tenant: Tenant | null
  isDemoMode: boolean
  setProfile: (profile: Profile | null) => void
  setTenant: (tenant: Tenant | null) => void
  updateTenant: (updates: Partial<Tenant>) => void
  updateProfile: (updates: Partial<Profile>) => void
  enterDemoMode: () => void
  logout: () => void
}

const DEMO_PROFILE: Profile = {
  id: 'demo-user-1',
  tenant_id: 'demo-tenant-1',
  full_name: 'Gestionnaire Demo',
  role: 'admin',
  avatar_url: null,
  created_at: new Date().toISOString(),
}

const DEMO_TENANT: Tenant = {
  id: 'demo-tenant-1',
  name: 'Agence Djerba Villas',
  plan: 'agence',
  trial_ends: null,
  created_at: new Date().toISOString(),
  property_types: ['Villa', 'Appartement'],
  slogan: 'Votre séjour de rêve à Djerba',
  founding_member: true,
  welcome_email_enabled: true,
  slug: 'demo-agence-djerba',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      tenant: null,
      isDemoMode: false,
      setProfile: (profile) => set({ profile }),
      setTenant: (tenant) => set({ tenant }),
      updateTenant:  (updates) => set(s => ({ tenant:  s.tenant  ? { ...s.tenant,  ...updates } : s.tenant  })),
      updateProfile: (updates) => set(s => ({ profile: s.profile ? { ...s.profile, ...updates } : s.profile })),
      enterDemoMode: () => set({ profile: DEMO_PROFILE, tenant: DEMO_TENANT, isDemoMode: true }),
      logout: () => set({ profile: null, tenant: null, isDemoMode: false }),
    }),
    { name: 'pms-auth' }
  )
)
