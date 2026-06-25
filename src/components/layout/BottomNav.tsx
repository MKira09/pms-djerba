import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Home, Calendar, ClipboardList, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'

export default function BottomNav() {
  const { t } = useTranslation()
  const { plural, isMultiType } = usePropertyTerm()

  const NAV = [
    { to: '/dashboard',    icon: LayoutDashboard, label: t('nav.dashboard').split(' ')[0] },
    { to: '/villas',       icon: Home,            label: isMultiType ? 'Biens' : plural },
    { to: '/calendar',     icon: Calendar,        label: t('nav.calendar') },
    { to: '/reservations', icon: ClipboardList,   label: t('nav.reservations').split(' ')[0] },
    { to: '/team',         icon: Users,           label: t('nav.team') },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-40 safe-bottom">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-brand-800' : 'text-gray-400'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
