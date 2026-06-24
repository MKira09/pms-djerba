import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Moon, Bell, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useAuthStore } from '@/stores/auth.store'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, tenant } = useAuthStore()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [company, setCompany] = useState(tenant?.name ?? '')

  const langOpts = [
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
  ]

  function handleLangChange(lang: string) {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">{t('nav.settings')}</h1>

      {/* Profile */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-700" /> Mon compte
        </h2>
        <div className="space-y-3">
          <Input label="Nom complet" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Nom de l'agence" value={company} onChange={e => setCompany(e.target.value)} />
          <Input label="Email" value={profile?.id ? 'demo@villahub.tn' : ''} disabled />
          <Button onClick={() => toast.success('Profil enregistré.')}>{t('common.save')}</Button>
        </div>
      </Card>

      {/* Language */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-brand-700" /> Langue de l'interface
        </h2>
        <Select
          label="Langue"
          options={langOpts}
          value={i18n.language}
          onChange={e => handleLangChange(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-gray-400 mt-2">
          Les emails clients seront envoyés dans la langue du client (détection automatique).
        </p>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-700" /> Notifications
        </h2>
        <div className="space-y-3">
          {['Nouvelle réservation', 'Rappel check-out', 'Tâche ménage en attente', 'Paiement reçu'].map(label => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">{label}</span>
              <input type="checkbox" defaultChecked className="accent-brand-800 w-4 h-4" />
            </label>
          ))}
        </div>
      </Card>

      {/* Dark mode */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Moon className="h-4 w-4 text-brand-700" /> Apparence
        </h2>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">Mode sombre</span>
          <button
            className="w-9 h-5 rounded-full bg-gray-300 relative transition-colors"
            onClick={() => toast('Mode sombre bientôt disponible !', { icon: '🌙' })}
          >
            <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
          </button>
        </label>
      </Card>
    </div>
  )
}
