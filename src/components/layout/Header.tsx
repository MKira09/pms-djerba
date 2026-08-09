import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, Globe, HelpCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { resetTour } from '@/components/onboarding/ProductTour'
import type { Lang } from '@/types'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
  { code: 'en', label: 'EN' },
]

export default function Header() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { tenant, profile, isDemoMode } = useAuthStore()

  function switchLang(lang: Lang) {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  function replayTour() {
    resetTour(profile?.id)
    navigate('/dashboard', { state: { startTour: true } })
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Mobile brand */}
      <div className="md:hidden font-bold text-brand-800">VillaHub</div>

      {/* Desktop: agency name + slogan */}
      <div className="hidden md:flex items-baseline gap-3">
        {tenant?.name && (
          <span className="font-semibold text-gray-800 text-sm">{tenant.name}</span>
        )}
        {tenant?.slogan && (
          <span className="text-xs text-gray-400 italic">{tenant.slogan}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Lang switcher */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 text-xs">
          <Globe className="h-3.5 w-3.5 text-gray-400 ml-1" />
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                i18n.language === l.code ? 'bg-brand-800 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Revoir la visite guidée du menu */}
        {!isDemoMode && (
          <button
            onClick={replayTour}
            title="Revoir la visite guidée"
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        )}

        {/* Notif bell */}
        <button className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
