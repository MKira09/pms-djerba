import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Moon, Bell, Shield, ShoppingBag, Building2, Home, Check, Mail } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useAuthStore } from '@/stores/auth.store'
import { useExtrasStore } from '@/stores/extras.store'
import { supabase } from '@/lib/supabase'
import { PROPERTY_TYPE_LIST } from '@/hooks/usePropertyTerm'
import type { Extra } from '@/types'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, tenant, isDemoMode, updateTenant } = useAuthStore()
  const { extras, fetch: fetchExtras, save: saveExtras } = useExtrasStore()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [company, setCompany] = useState(tenant?.name ?? '')
  const [slogan, setSlogan] = useState(tenant?.slogan ?? '')
  const [propertyTypes, setPropertyTypes] = useState<string[]>(
    tenant?.property_types?.length ? tenant.property_types : ['Villa']
  )
  const [savingAgency, setSavingAgency] = useState(false)
  const [localExtras, setLocalExtras] = useState<Extra[]>([])
  const [emailEnabled, setEmailEnabled] = useState(tenant?.welcome_email_enabled !== false)
  const [savingEmail, setSavingEmail] = useState(false)

  function toggleType(type: string) {
    setPropertyTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev
        : [...prev, type]
    )
  }

  useEffect(() => { fetchExtras() }, [])
  useEffect(() => { setLocalExtras(extras) }, [extras])

  function updateExtraPrice(id: string, price: number) {
    setLocalExtras(prev => prev.map(e => e.id === id ? { ...e, price } : e))
  }

  async function handleSaveExtras() {
    await saveExtras(localExtras)
    toast.success('Tarifs extras enregistrés.')
  }

  async function handleSaveEmailSettings() {
    if (!tenant) return
    setSavingEmail(true)
    try {
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update({ welcome_email_enabled: emailEnabled }).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant({ welcome_email_enabled: emailEnabled })
      toast.success('Paramètres email enregistrés.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleSaveAgency() {
    if (!tenant) return
    setSavingAgency(true)
    try {
      const updates = {
        name: company.trim() || tenant.name,
        slogan: slogan.trim() || null,
        property_types: propertyTypes,
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

      {/* Property types */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Home className="h-4 w-4 text-brand-700" /> Types de biens gérés
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Cochez tous les types de biens que vous gérez. Vous pourrez assigner un type à chaque bien dans son formulaire.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {PROPERTY_TYPE_LIST.map(type => {
            const checked = propertyTypes.includes(type)
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  checked
                    ? 'bg-brand-800 text-white border-brand-800'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
                {type}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {propertyTypes.length === 1
            ? `Menu affiché : "${propertyTypes[0]}s" · Un seul type sélectionné`
            : `Menu affiché : "Mes biens" · ${propertyTypes.length} types sélectionnés (${propertyTypes.join(', ')})`}
        </p>
        <Button onClick={handleSaveAgency} loading={savingAgency}>Enregistrer</Button>
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

      {/* Welcome email */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-700" /> Email de bienvenue
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Un email est envoyé automatiquement au client 2 heures avant son arrivée avec le code d'accès, le WiFi et les contacts.
        </p>
        <label className="flex items-center justify-between cursor-pointer mb-4">
          <span className="text-sm text-gray-700">Activer l'email de bienvenue automatique</span>
          <button
            type="button"
            onClick={() => setEmailEnabled(v => !v)}
            className={`w-11 h-6 rounded-full relative transition-colors ${emailEnabled ? 'bg-brand-700' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${emailEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </label>
        <Button onClick={handleSaveEmailSettings} loading={savingEmail}>Enregistrer</Button>
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
