import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Home, Calendar, ClipboardList, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/villas',       icon: Home,            key: 'nav.villas' },
  { to: '/calendar',     icon: Calendar,        key: 'nav.calendar' },
  { to: '/reservations', icon: ClipboardList,   key: 'nav.reservations' },
  { to: '/team',         icon: Users,           key: 'nav.team' },
]

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-40 safe-bottom">
      {NAV.map(({ to, icon: Icon, key }) => (
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
              <span>{t(key).split(' ')[0]}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
