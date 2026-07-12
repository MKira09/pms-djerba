import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Moon, Bell, Shield, ShoppingBag, Building2, Home, Check, Mail, Plus, Pencil, Trash2, Upload, Coins, Link2, Copy, CheckCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/auth.store'
import { useExtrasStore } from '@/stores/extras.store'
import { supabase } from '@/lib/supabase'
import { PROPERTY_TYPE_LIST } from '@/hooks/usePropertyTerm'
import { CURRENCIES, toSlug } from '@/lib/utils'
import type { Extra } from '@/types'
import toast from 'react-hot-toast'

const EMOJI_PRESETS = ['🧹', '👨‍🍳', '🚗', '🏖️', '🛏️', '🛁', '🍳', '🚁', '🎉', '🌊', '🧺', '🐾', '🚤', '🍾', '🧴']

const EMPTY_FORM = { name: '', price: 0, description: '', icon: '' }

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, tenant, isDemoMode, updateTenant, updateProfile } = useAuthStore()
  const { extras, fetch: fetchExtras, addExtra, updateExtra, removeExtra, toggleExtra } = useExtrasStore()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [company, setCompany] = useState(tenant?.name ?? '')
  const [slogan, setSlogan] = useState(tenant?.slogan ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(tenant?.logo_url ?? '')
  const [propertyTypes, setPropertyTypes] = useState<string[]>(
    tenant?.property_types?.length ? tenant.property_types : ['Villa']
  )
  const [savingAgency, setSavingAgency] = useState(false)
  const [savingPropertyTypes, setSavingPropertyTypes] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(tenant?.welcome_email_enabled !== false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [currency, setCurrency] = useState(tenant?.currency ?? 'EUR')
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [catalogueSlug, setCatalogueSlug] = useState(
    tenant?.slug ?? (tenant?.name ? toSlug(tenant.name) : '')
  )
  const [savingSlug, setSavingSlug] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Extra form state
  const [extraFormOpen, setExtraFormOpen] = useState(false)
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null)
  const [extraForm, setExtraForm] = useState(EMPTY_FORM)
  const [savingExtra, setSavingExtra] = useState(false)
  const [deleteExtraId, setDeleteExtraId] = useState<string | null>(null)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo trop lourd (max 2 Mo).'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function clearLogo() {
    setLogoFile(null)
    setLogoPreview('')
  }

  function toggleType(type: string) {
    setPropertyTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev
        : [...prev, type]
    )
  }

  // Load real email from auth session (not stored in profiles table)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => { fetchExtras() }, [])

  async function handleSaveProfile() {
    if (!profile) return
    setSavingProfile(true)
    try {
      const trimmed = name.trim()
      if (!isDemoMode) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: trimmed })
          .eq('id', profile.id)
        if (error) {
          console.error('[handleSaveProfile]', error)
          toast.error(`Erreur : ${error.message}`)
          return
        }
      }
      updateProfile({ full_name: trimmed })
      toast.success('Profil enregistré.')
    } catch (e: unknown) {
      console.error('[handleSaveProfile unexpected]', e)
      toast.error('Erreur inattendue — voir la console.')
    } finally {
      setSavingProfile(false)
    }
  }

  function openExtraForm(extra: Extra | null) {
    setEditingExtra(extra)
    setExtraForm(extra
      ? { name: extra.name, price: extra.price, description: extra.description ?? '', icon: extra.icon ?? '' }
      : EMPTY_FORM
    )
    setExtraFormOpen(true)
  }

  async function handleSaveExtra(e: React.FormEvent) {
    e.preventDefault()
    if (!extraForm.name.trim()) { toast.error('Le nom est requis.'); return }
    setSavingExtra(true)
    try {
      const data = {
        name: extraForm.name.trim(),
        price: extraForm.price,
        description: extraForm.description.trim() || undefined,
        icon: extraForm.icon.trim() || undefined,
        enabled: true,
      }
      if (editingExtra) {
        await updateExtra(editingExtra.id, data)
        toast.success('Service modifié.')
      } else {
        await addExtra(data)
        toast.success('Service ajouté !')
      }
      setExtraFormOpen(false)
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setSavingExtra(false)
    }
  }

  async function handleDeleteExtra() {
    if (!deleteExtraId) return
    try {
      await removeExtra(deleteExtraId)
      toast.success('Service supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    } finally {
      setDeleteExtraId(null)
    }
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

  async function handleSaveCurrency() {
    if (!tenant) return
    setSavingCurrency(true)
    try {
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update({ currency }).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant({ currency })
      toast.success('Devise enregistrée.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleSaveSlug() {
    if (!tenant) return
    const slug = catalogueSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!slug || slug.length < 2) { toast.error('Identifiant trop court (min 2 caractères).'); return }
    setCatalogueSlug(slug)
    setSavingSlug(true)
    try {
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update({ slug }).eq('id', tenant.id)
        if (error) {
          if (error.code === '23505') toast.error('Cet identifiant est déjà utilisé. Essayez-en un autre.')
          else toast.error(`Erreur : ${error.message}`)
          return
        }
      }
      updateTenant({ slug })
      toast.success('Identifiant catalogue enregistré.')
    } finally {
      setSavingSlug(false)
    }
  }

  function handleCopyLink() {
    const slug = tenant?.slug ?? catalogueSlug
    if (!slug) return
    const url = `${window.location.origin}/catalogue/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  async function handleSaveAgency() {
    if (!tenant) return
    setSavingAgency(true)
    try {
      let newLogoUrl: string | null = tenant.logo_url ?? null

      // --- Upload logo if a new file was selected ---
      if (logoFile) {
        if (isDemoMode) {
          // In demo mode use the local object URL as a preview stand-in
          newLogoUrl = logoPreview
        } else {
          const ext = (logoFile.name.split('.').pop() ?? 'png').toLowerCase()
          const path = `${tenant.id}/logo.${ext}`

          const { error: upErr } = await supabase.storage
            .from('logos')
            .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

          if (upErr) {
            console.error('[logo upload]', upErr)
            toast.error(`Upload échoué : ${upErr.message}`)
            return
          }

          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
          // Bust the CDN cache so the new image shows immediately
          newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`
        }
      } else if (!logoPreview && tenant.logo_url) {
        // User cleared the logo
        newLogoUrl = null
      }

      // --- Persist name / slogan / logo_url ---
      const updates = {
        name: company.trim() || tenant.name,
        slogan: slogan.trim() || null,
        logo_url: newLogoUrl,
      }

      if (!isDemoMode) {
        const { error: dbErr } = await supabase.from('tenants').update(updates).eq('id', tenant.id)
        if (dbErr) {
          console.error('[save agency]', dbErr)
          toast.error(`Sauvegarde échouée : ${dbErr.message}`)
          return
        }
      }

      updateTenant(updates)
      setLogoFile(null)
      toast.success('Paramètres agence enregistrés.')
    } catch (err) {
      console.error('[handleSaveAgency unexpected]', err)
      toast.error('Erreur inattendue — voir la console.')
    } finally {
      setSavingAgency(false)
    }
  }

  async function handleSavePropertyTypes() {
    if (!tenant) return
    setSavingPropertyTypes(true)
    try {
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update({ property_types: propertyTypes }).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant({ property_types: propertyTypes })
      toast.success('Types de biens enregistrés.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingPropertyTypes(false)
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
          <Input label="Email" value={email} disabled />
          <Button onClick={handleSaveProfile} loading={savingProfile}>{t('common.save')}</Button>
        </div>
      </Card>

      {/* Agency */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand-700" /> Agence
        </h2>
        <div className="space-y-4">
          <Input
            label="Nom de l'agence"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Ex : Djerba Prestige Villas"
          />
          <Input
            label="Slogan"
            value={slogan}
            onChange={e => setSlogan(e.target.value)}
            placeholder="Ex : Votre séjour de rêve à Djerba"
          />
          <p className="text-xs text-gray-400 -mt-2">Le nom et le slogan s'affichent dans la barre latérale.</p>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo de l'agence</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Building2 className="h-6 w-6 text-gray-300" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-lg px-3 py-2 hover:bg-brand-50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" />
                </label>
                <p className="text-xs text-gray-400">PNG, JPG, SVG · Max 2 Mo · Carré recommandé</p>
                {logoPreview && (
                  <button type="button" onClick={clearLogo} className="text-xs text-red-500 hover:underline block">
                    Supprimer le logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSaveAgency} loading={savingAgency}>
            Enregistrer les modifications
          </Button>
        </div>
      </Card>

      {/* Catalogue public */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-brand-700" /> Catalogue public
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Partagez ce lien avec vos clients pour qu'ils puissent consulter et réserver vos villas en ligne.
        </p>

        {/* Shareable link */}
        {(tenant?.slug || catalogueSlug) && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 truncate font-mono">
              {window.location.origin}/catalogue/{tenant?.slug ?? catalogueSlug}
            </div>
            <button
              onClick={handleCopyLink}
              className="shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl border border-gray-200 hover:border-brand-400 hover:text-brand-700 transition-colors"
            >
              {copiedLink ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copiedLink ? 'Copié !' : 'Copier'}
            </button>
          </div>
        )}

        {/* Slug input */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant URL</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">…/catalogue/</span>
              <input
                type="text"
                value={catalogueSlug}
                onChange={e => setCatalogueSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="mon-agence"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Lettres minuscules, chiffres et tirets uniquement.</p>
          </div>
          <Button onClick={handleSaveSlug} loading={savingSlug} size="sm">Enregistrer l'identifiant</Button>
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
        <Button onClick={handleSavePropertyTypes} loading={savingPropertyTypes}>Enregistrer</Button>
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

      {/* Currency */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-brand-700" /> Devise
        </h2>
        <Select
          label="Devise utilisée dans l'application"
          options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.label} (${c.symbol})` }))}
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-gray-400 mt-2 mb-4">
          S'applique à tous les montants : dashboard, réservations, villas.
        </p>
        <Button onClick={handleSaveCurrency} loading={savingCurrency}>Enregistrer</Button>
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

      {/* ─── Extras & Services ─── */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand-700" /> Extras & Services
          </h2>
          <button
            onClick={() => openExtraForm(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter un service
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Ces services s'affichent dans le formulaire de réservation. Désactivez-en pour les masquer temporairement.
        </p>

        <div className="space-y-2">
          {extras.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6 italic">Aucun service configuré.</p>
          )}
          {extras.map(extra => {
            const active = extra.enabled !== false
            return (
              <div key={extra.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                {/* Icon */}
                <span className="text-2xl w-8 text-center flex-shrink-0">{extra.icon || '📦'}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {extra.name}
                  </p>
                  {extra.description && (
                    <p className="text-xs text-gray-400 truncate">{extra.description}</p>
                  )}
                  <p className="text-sm font-semibold text-brand-800 mt-0.5">{extra.price} {currency}</p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleExtra(extra.id)}
                  title={active ? 'Désactiver' : 'Activer'}
                  className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${active ? 'bg-brand-700' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'left-5' : 'left-1'}`} />
                </button>

                {/* Edit */}
                <button
                  onClick={() => openExtraForm(extra)}
                  className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => setDeleteExtraId(extra.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
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

      {/* ─── Modal add/edit extra ─── */}
      <Modal
        open={extraFormOpen}
        onClose={() => setExtraFormOpen(false)}
        title={editingExtra ? 'Modifier le service' : 'Nouveau service'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setExtraFormOpen(false)}>{t('common.cancel')}</Button>
            <Button form="extra-form" type="submit" loading={savingExtra}>{t('common.save')}</Button>
          </>
        }
      >
        <form id="extra-form" onSubmit={handleSaveExtra} className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icône / Emoji</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={extraForm.icon}
                onChange={e => setExtraForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🏖️"
                maxLength={4}
                className="w-16 h-10 text-center text-xl border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              <span className="text-xs text-gray-400">Saisir un emoji ou choisir :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setExtraForm(f => ({ ...f, icon: emoji }))}
                  className={`w-9 h-9 text-lg rounded-lg border transition-colors ${extraForm.icon === emoji ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <Input
            label="Nom du service"
            value={extraForm.name}
            onChange={e => setExtraForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex : Petit déjeuner, Transfert aéroport…"
            required
          />

          {/* Price + currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Prix"
                type="number"
                min={0}
                value={extraForm.price}
                onChange={e => setExtraForm(f => ({ ...f, price: +e.target.value }))}
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise</label>
              <div className="flex items-center h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 font-medium">
                {currency}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <input
              value={extraForm.description}
              onChange={e => setExtraForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex : Inclus café, jus, viennoiseries…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </form>
      </Modal>

      {/* ─── Modal delete confirm ─── */}
      <Modal
        open={!!deleteExtraId}
        onClose={() => setDeleteExtraId(null)}
        title="Supprimer le service"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteExtraId(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDeleteExtra}>Supprimer</Button>
          </>
        }
      >
        <p className="text-gray-600">Confirmer la suppression de ce service ? Il sera retiré de tous les formulaires de réservation.</p>
      </Modal>
    </div>
  )
}
