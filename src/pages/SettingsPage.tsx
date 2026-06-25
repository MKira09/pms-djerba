import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Moon, Bell, Shield, ShoppingBag, Building2, Home } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useAuthStore } from '@/stores/auth.store'
import { useExtrasStore } from '@/stores/extras.store'
import { supabase } from '@/lib/supabase'
import type { Extra } from '@/types'
import toast from 'react-hot-toast'

const PROPERTY_TYPE_OPTIONS = [
  { value: 'Villa', label: 'Villa' },
  { value: 'Appartement', label: 'Appartement' },
  { value: 'Maison', label: 'Maison' },
  { value: 'Riad', label: 'Riad' },
  { value: 'Chalet', label: 'Chalet' },
  { value: 'Bungalow', label: 'Bungalow' },
  { value: 'Studio', label: 'Studio' },
  { value: 'Autre', label: 'Autre (personnalisé)' },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, tenant, isDemoMode, updateTenant } = useAuthStore()
  const { extras, fetch: fetchExtras, save: saveExtras } = useExtrasStore()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [company, setCompany] = useState(tenant?.name ?? '')
  const [slogan, setSlogan] = useState(tenant?.slogan ?? '')
  const [propertyType, setPropertyType] = useState(tenant?.property_type ?? 'Villa')
  const [propertyTypeCustom, setPropertyTypeCustom] = useState(tenant?.property_type_custom ?? '')
  const [savingAgency, setSavingAgency] = useState(false)
  const [localExtras, setLocalExtras] = useState<Extra[]>([])

  useEffect(() => { fetchExtras() }, [])
  useEffect(() => { setLocalExtras(extras) }, [extras])

  function updateExtraPrice(id: string, price: number) {
    setLocalExtras(prev => prev.map(e => e.id === id ? { ...e, price } : e))
  }

  async function handleSaveExtras() {
    await saveExtras(localExtras)
    toast.success('Tarifs extras enregistrés.')
  }

  async function handleSaveAgency() {
    if (!tenant) return
    setSavingAgency(true)
    try {
      const updates = {
        name: company.trim() || tenant.name,
        slogan: slogan.trim() || null,
        property_type: propertyType,
        property_type_custom: propertyType === 'Autre' ? propertyTypeCustom.trim() : null,
      }
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update(updates).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant(updates)
      toast.success('Paramètres agence enregistrés.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingAgency(false)
    }
  }

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
          <Input label="Email" value={profile?.id ? 'demo@villahub.tn' : ''} disabled />
          <Button onClick={() => toast.success('Profil enregistré.')}>{t('common.save')}</Button>
        </div>
      </Card>

      {/* Agency */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand-700" /> Agence
        </h2>
        <div className="space-y-3">
          <Input label="Nom de l'agence" value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex : Djerba Prestige Villas" />
          <Input label="Slogan" value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Ex : Votre séjour de rêve à Djerba" />
          <p className="text-xs text-gray-400">Le slogan s'affiche dans l'en-tête de l'application.</p>
        </div>
      </Card>

      {/* Property type */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Home className="h-4 w-4 text-brand-700" /> Type de biens
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez le terme utilisé pour désigner vos propriétés dans toute l'application.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {PROPERTY_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPropertyType(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-center ${
                propertyType === opt.value
                  ? 'bg-brand-800 text-white border-brand-800'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {propertyType === 'Autre' && (
          <Input
            label="Terme personnalisé (singulier)"
            value={propertyTypeCustom}
            onChange={e => setPropertyTypeCustom(e.target.value)}
            placeholder="Ex : Maison de vacances"
            className="max-w-xs"
          />
        )}
        {propertyType !== 'Autre' && (
          <p className="text-xs text-gray-400">
            Le terme "<strong>{propertyType}</strong>" remplacera "Villa" dans les menus, formulaires et tableaux de bord.
          </p>
        )}
        <div className="mt-4">
          <Button onClick={handleSaveAgency} loading={savingAgency}>Enregistrer</Button>
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

      {/* Extras */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-brand-700" /> Extras & Services
        </h2>
        <p className="text-xs text-gray-400 mb-4">Configurez les prix des extras proposés lors des réservations.</p>
        <div className="space-y-3">
          {localExtras.map(extra => (
            <div key={extra.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-gray-700">{extra.name}</span>
              <div className="flex items-center gap-2 w-40">
                <Input
                  type="number"
                  min={0}
                  value={extra.price}
                  onChange={e => updateExtraPrice(extra.id, +e.target.value)}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">TND</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveExtras}>Enregistrer les prix</Button>
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
