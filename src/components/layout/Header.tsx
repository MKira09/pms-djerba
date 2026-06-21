import { useTranslation } from 'react-i18next'
import { Bell, Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import type { Lang } from '@/types'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
  { code: 'en', label: 'EN' },
]

export default function Header() {
  const { i18n } = useTranslation()
  useAuthStore()

  function switchLang(lang: Lang) {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Mobile brand */}
      <div className="md:hidden font-bold text-brand-800">PMS Djerba</div>
      <div className="hidden md:block" />

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

        {/* Notif bell */}
        <button className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
