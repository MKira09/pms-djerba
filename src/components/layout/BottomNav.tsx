import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Home, Calendar, ClipboardList, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { useVillasStore } from '@/stores/villas.store'

export default function BottomNav() {
  const { t } = useTranslation()
  const { plural, isMultiType, types } = usePropertyTerm()
  const { villas } = useVillasStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const onVillas = location.pathname === '/villas'
  const activeType = new URLSearchParams(location.search).get('type')

  function countByType(type: string) {
    return villas.filter(v => (v.property_type || types[0]) === type).length
  }

  return (
    <>
      {/* Type popup — rendered above the nav bar */}
      {typeMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30"
            onClick={() => setTypeMenuOpen(false)}
          />
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 mx-3 mb-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Filtrer par type</span>
              <button onClick={() => setTypeMenuOpen(false)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => { navigate('/villas'); setTypeMenuOpen(false) }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  onVillas && !activeType ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span>Tous les biens</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{villas.length}</span>
              </button>
              {types.sort((a, b) => a.localeCompare(b, 'fr')).map(type => (
                <button
                  key={type}
                  onClick={() => { navigate(`/villas?type=${encodeURIComponent(type)}`); setTypeMenuOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    activeType === type ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span>{type}s</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{countByType(type)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-40 safe-bottom">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => cn('flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-800' : 'text-gray-400')}
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
              <span>{t('nav.dashboard').split(' ')[0]}</span>
            </>
          )}
        </NavLink>

        {/* Biens — simple or with popup */}
        {!isMultiType ? (
          <NavLink
            to="/villas"
            className={({ isActive }) => cn('flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-800' : 'text-gray-400')}
          >
            {({ isActive }) => (
              <>
                <Home className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
                <span>{plural}</span>
              </>
            )}
          </NavLink>
        ) : (
          <button
            onClick={() => setTypeMenuOpen(o => !o)}
            className={cn(
              'flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
              onVillas ? 'text-brand-800' : 'text-gray-400'
            )}
          >
            <Home className={cn('h-5 w-5', onVillas && 'stroke-brand-800')} />
            <span>Biens</span>
          </button>
        )}

        <NavLink
          to="/calendar"
          className={({ isActive }) => cn('flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-800' : 'text-gray-400')}
        >
          {({ isActive }) => (
            <>
              <Calendar className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
              <span>{t('nav.calendar')}</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/reservations"
          className={({ isActive }) => cn('flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-800' : 'text-gray-400')}
        >
          {({ isActive }) => (
            <>
              <ClipboardList className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
              <span>{t('nav.reservations').split(' ')[0]}</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/team"
          className={({ isActive }) => cn('flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-800' : 'text-gray-400')}
        >
          {({ isActive }) => (
            <>
              <Users className={cn('h-5 w-5', isActive && 'stroke-brand-800')} />
              <span>{t('nav.team')}</span>
            </>
          )}
        </NavLink>
      </nav>
    </>
  )
}
