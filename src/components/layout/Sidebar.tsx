import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Home, Calendar, ClipboardList,
  Users, TrendingUp, Mail, Settings, CreditCard, LogOut, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const BOTTOM_NAV = [
  { to: '/settings',     icon: Settings,        key: 'nav.settings' },
  { to: '/subscription', icon: CreditCard,      key: 'nav.subscription' },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const { logout, profile, tenant, isDemoMode } = useAuthStore()
  const { plural } = usePropertyTerm()
  const navigate = useNavigate()

  const NAV = [
    { to: '/dashboard',      icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/villas',         icon: Home,            label: plural },
    { to: '/calendar',       icon: Calendar,        label: t('nav.calendar') },
    { to: '/reservations',   icon: ClipboardList,   label: t('nav.reservations') },
    { to: '/team',           icon: Users,           label: t('nav.team') },
    { to: '/pricing',        icon: TrendingUp,      label: t('nav.pricing') },
    { to: '/communications', icon: Mail,            label: t('nav.communications') },
    { to: '/blacklist',      icon: ShieldAlert,     label: t('nav.blacklist') },
  ]

  async function handleLogout() {
    if (!isDemoMode) await supabase.auth.signOut()
    logout()
    navigate('/login')
    toast.success(t('auth.logout'))
  }

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
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-brand-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
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
