import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Home, Calendar, ClipboardList,
  Users, TrendingUp, Mail, Settings, CreditCard, LogOut, ShieldAlert, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { useVillasStore } from '@/stores/villas.store'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const BOTTOM_NAV = [
  { to: '/settings',     icon: Settings,    key: 'nav.settings' },
  { to: '/subscription', icon: CreditCard,  key: 'nav.subscription' },
]

const NAV_LINKS = [
  { to: '/dashboard',      icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/calendar',       icon: Calendar,        key: 'nav.calendar' },
  { to: '/reservations',   icon: ClipboardList,   key: 'nav.reservations' },
  { to: '/team',           icon: Users,           key: 'nav.team' },
  { to: '/pricing',        icon: TrendingUp,      key: 'nav.pricing' },
  { to: '/communications', icon: Mail,            key: 'nav.communications' },
  { to: '/blacklist',      icon: ShieldAlert,     key: 'nav.blacklist' },
]

const LINK_CLASS = (isActive: boolean) => cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
  isActive ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
)

export default function Sidebar() {
  const { t } = useTranslation()
  const { logout, profile, tenant, isDemoMode } = useAuthStore()
  const { plural, isMultiType, types } = usePropertyTerm()
  const { villas } = useVillasStore()
  const navigate = useNavigate()
  const location = useLocation()
  const onVillas = location.pathname === '/villas'
  const [bienOpen, setBienOpen] = useState(onVillas)

  useEffect(() => {
    if (onVillas) setBienOpen(true)
  }, [onVillas])

  function countByType(type: string) {
    return villas.filter(v => (v.property_type || types[0]) === type).length
  }

  async function handleLogout() {
    if (!isDemoMode) await supabase.auth.signOut()
    logout()
    navigate('/login')
    toast.success(t('auth.logout'))
  }

  const activeType = new URLSearchParams(location.search).get('type')

  return (
    <aside className="hidden md:flex flex-col w-64 bg-brand-800 text-white shadow-xl flex-shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-brand-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">VillaHub</p>
            <p className="text-brand-300 text-xs truncate max-w-[140px]">{tenant?.name ?? '—'}</p>
          </div>
        </div>
        {isDemoMode && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs px-3 py-1.5 rounded-lg">
            🎯 Mode démonstration
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <NavLink to="/dashboard" className={({ isActive }) => LINK_CLASS(isActive)}>
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          {t('nav.dashboard')}
        </NavLink>

        {/* Biens — single type: simple NavLink / multi: collapsible */}
        {!isMultiType ? (
          <NavLink to="/villas" className={({ isActive }) => LINK_CLASS(isActive)}>
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">Mes {plural}</span>
            {villas.length > 0 && (
              <span className="text-[11px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">
                {villas.length}
              </span>
            )}
          </NavLink>
        ) : (
          <div>
            <button
              onClick={() => setBienOpen(o => !o)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                onVillas ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">Mes biens</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', bienOpen && 'rotate-180')} />
            </button>

            {bienOpen && (
              <div className="mt-0.5 ml-8 space-y-0.5">
                <NavLink
                  to="/villas"
                  end
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    onVillas && !activeType ? 'bg-white/15 text-white' : 'text-brand-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span>Tous les biens</span>
                  <span className="text-[11px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">
                    {villas.length}
                  </span>
                </NavLink>
                {types.sort((a, b) => a.localeCompare(b, 'fr')).map(type => (
                  <NavLink
                    key={type}
                    to={`/villas?type=${encodeURIComponent(type)}`}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeType === type ? 'bg-white/15 text-white' : 'text-brand-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span>{type}s</span>
                    <span className="text-[11px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">
                      {countByType(type)}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rest of nav */}
        {NAV_LINKS.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={({ isActive }) => LINK_CLASS(isActive)}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-brand-700 space-y-0.5">
        {BOTTOM_NAV.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {t(key)}
          </NavLink>
        ))}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(profile?.full_name?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Admin'}</p>
            <p className="text-xs text-brand-300 capitalize">{profile?.role}</p>
          </div>
          <button onClick={handleLogout} title={t('auth.logout')} className="text-brand-300 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
