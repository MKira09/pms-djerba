import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Globe, Moon, Bell, Shield, ShoppingBag, Building2, Home, Check, Mail, Plus, Pencil, Trash2, Upload, Coins, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Landmark, Palette, RotateCcw, Eye, Star } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/auth.store'
import { useExtrasStore } from '@/stores/extras.store'
import { supabase } from '@/lib/supabase'
import { PROPERTY_TYPE_LIST } from '@/hooks/usePropertyTerm'
import { CURRENCIES } from '@/lib/utils'
import { BRAND_FONTS } from '@/components/brand/BrandStyle'
import type { Extra } from '@/types'
import toast from 'react-hot-toast'

const EMOJI_PRESETS = ['🧹', '👨‍🍳', '🚗', '🏖️', '🛏️', '🛁', '🍳', '🚁', '🎉', '🌊', '🧺', '🐾', '🚤', '🍾', '🧴']

const EMPTY_FORM = { name: '', price: 0, description: '', icon: '' }

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, tenant, isDemoMode, updateTenant, updateProfile } = useAuthStore()
  const { extras, fetch: fetchExtras, addExtra, updateExtra, removeExtra, toggleExtra } = useExtrasStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Stripe Connect state ──────────────────────────────────────────
  // null = checking, true = active, false = not connected / incomplete
  const [stripeStatus, setStripeStatus] = useState<{ charges_enabled: boolean; details_submitted: boolean } | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
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

  // PayPal & Virement state
  const [paypalMe, setPaypalMe] = useState(tenant?.paypal_me ?? '')
  const [bankHolder, setBankHolder] = useState(tenant?.bank_holder ?? '')
  const [bankName, setBankName] = useState(tenant?.bank_name ?? '')
  const [bankIban, setBankIban] = useState(tenant?.bank_iban ?? '')
  const [bankBic, setBankBic] = useState(tenant?.bank_bic ?? '')
  const [savingPaypal, setSavingPaypal] = useState(false)
  const [savingBank, setSavingBank] = useState(false)

  const [brandPrimary, setBrandPrimary] = useState(tenant?.brand_color_primary ?? '')
  const [brandSecondary, setBrandSecondary] = useState(tenant?.brand_color_secondary ?? '')
  const [brandFont, setBrandFont] = useState(tenant?.brand_font ?? 'Inter')
  const [savingBrand, setSavingBrand] = useState(false)
  const [brandPreview, setBrandPreview] = useState(false)

  const [reviewLink, setReviewLink] = useState(tenant?.review_link ?? '')
  const [savingReview, setSavingReview] = useState(false)

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

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe_return')) {
      toast.success('Configuration Stripe enregistrée !')
      setSearchParams({}, { replace: true })
    } else if (searchParams.get('stripe_refresh')) {
      toast('Le lien Stripe a expiré. Relancez la connexion.', { icon: '⚠️' })
      setSearchParams({}, { replace: true })
    }
  }, [])

  // Check Stripe account status when account_id is known
  useEffect(() => {
    const accountId = tenant?.stripe_account_id
    if (!accountId) { setStripeStatus(null); return }
    fetch(`/api/stripe-connect-status?account_id=${accountId}`)
      .then(r => r.json())
      .then(d => setStripeStatus({ charges_enabled: d.charges_enabled, details_submitted: d.details_submitted }))
      .catch(() => setStripeStatus(null))
  }, [tenant?.stripe_account_id])

  async function handleConnectStripe() {
    if (!tenant || isDemoMode) return
    setStripeLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { tenant_id: tenant.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''))
      if (!data?.url) throw new Error('Pas de lien retourné')
      if (data.type === 'dashboard') {
        window.open(data.url, '_blank', 'noopener')
      } else {
        window.location.href = data.url
      }
    } catch (e: unknown) {
      toast.error('Erreur Stripe : ' + (e instanceof Error ? e.message : String(e)), { duration: 8000 })
    } finally {
      setStripeLoading(false)
    }
  }

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

  async function handleSavePaypal() {
    if (!tenant) return
    setSavingPaypal(true)
    try {
      let normalized = paypalMe.trim()
      if (normalized && !normalized.startsWith('http')) {
        normalized = `https://paypal.me/${normalized}`
      }
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update({ paypal_me: normalized || null }).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant({ paypal_me: normalized || null })
      setPaypalMe(normalized)
      toast.success('Lien PayPal enregistré.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingPaypal(false)
    }
  }

  async function handleSaveBank() {
    if (!tenant) return
    setSavingBank(true)
    try {
      const updates = {
        bank_holder: bankHolder.trim() || null,
        bank_name:   bankName.trim()   || null,
        bank_iban:   bankIban.trim().toUpperCase().replace(/\s+/g, '') || null,
        bank_bic:    bankBic.trim().toUpperCase() || null,
      }
      if (!isDemoMode) {
        const { error } = await supabase.from('tenants').update(updates).eq('id', tenant.id)
        if (error) throw error
      }
      updateTenant(updates)
      toast.success('Coordonnées bancaires enregistrées.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingBank(false)
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

  async function handleSaveBrand() {
    if (!tenant || isDemoMode) return
    setSavingBrand(true)
    try {
      const updates = {
        brand_color_primary:   brandPrimary   || null,
        brand_color_secondary: brandSecondary || null,
        brand_font:            brandFont === 'Inter' ? null : brandFont,
      }
      const { error } = await supabase.from('tenants').update(updates).eq('id', tenant.id)
      if (error) throw error
      updateTenant(updates)
      toast.success('Personnalisation enregistrée — actualisez la page pour voir les changements.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingBrand(false)
    }
  }

  async function handleSaveReviewLink() {
    if (!tenant || isDemoMode) return
    setSavingReview(true)
    try {
      const link = reviewLink.trim() || null
      const { error } = await supabase.from('tenants').update({ review_link: link }).eq('id', tenant.id)
      if (error) throw error
      updateTenant({ review_link: link })
      toast.success('Lien enregistré.')
    } catch {
      toast.error('Erreur lors de l\'enregistrement.')
    } finally {
      setSavingReview(false)
    }
  }

  async function handleResetBrand() {
    if (!tenant || isDemoMode) return
    setBrandPrimary('')
    setBrandSecondary('')
    setBrandFont('Inter')
    setBrandPreview(false)
    const updates = { brand_color_primary: null, brand_color_secondary: null, brand_font: null }
    await supabase.from('tenants').update(updates).eq('id', tenant.id)
    updateTenant(updates)
    toast.success('Personnalisation réinitialisée.')
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

      {/* ─── Recevoir mes paiements ─── */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-700" /> Recevoir mes paiements
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Connectez un compte Stripe Express pour recevoir les paiements de vos clients directement sur votre compte bancaire.
          Stripe gère la vérification d'identité, le RIB et les virements automatiques.
        </p>

        {!tenant?.stripe_account_id ? (
          /* ── Jamais connecté ── */
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Aucun compte Stripe connecté</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Sans connexion, le bouton « Envoyer lien de paiement » dans les réservations sera désactivé.
                </p>
              </div>
            </div>
            <Button
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={handleConnectStripe}
              loading={stripeLoading}
              disabled={isDemoMode}
            >
              Connecter mon compte Stripe Express
            </Button>
            {isDemoMode && <p className="text-xs text-gray-400">Non disponible en mode démo.</p>}
          </div>
        ) : stripeStatus === null ? (
          /* ── Vérification en cours ── */
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 rounded-full border-2 border-brand-800 border-t-transparent animate-spin shrink-0" />
            Vérification du compte Stripe…
          </div>
        ) : stripeStatus.charges_enabled ? (
          /* ── Compte actif ── */
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Compte Stripe actif — paiements activés</p>
                <p className="text-xs text-green-600 font-mono mt-0.5 select-all">{tenant.stripe_account_id}</p>
              </div>
            </div>
            <Button
              variant="outline"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={handleConnectStripe}
              loading={stripeLoading}
            >
              Gérer mon tableau de bord Stripe
            </Button>
          </div>
        ) : (
          /* ── Compte créé mais configuration incomplète ── */
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Configuration Stripe incomplète</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Votre compte a été créé mais la vérification n'est pas terminée.
                  Cliquez ci-dessous pour reprendre là où vous en étiez.
                </p>
              </div>
            </div>
            <Button
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={handleConnectStripe}
              loading={stripeLoading}
            >
              Continuer la configuration Stripe
            </Button>
          </div>
        )}
      </Card>

      {/* ─── PayPal ─── */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span className="font-extrabold text-blue-600 text-base leading-none">P</span> PayPal
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Entrez votre lien PayPal.me pour envoyer un lien de paiement PayPal à vos clients depuis les réservations.
        </p>
        <Input
          label="Lien PayPal.me"
          value={paypalMe}
          onChange={e => setPaypalMe(e.target.value)}
          placeholder="https://paypal.me/votre-compte"
        />
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Entrez l'URL complète ou juste votre nom d'utilisateur — on complétera automatiquement.
        </p>
        <Button onClick={handleSavePaypal} loading={savingPaypal} disabled={isDemoMode}>
          Enregistrer
        </Button>
        {isDemoMode && <p className="text-xs text-gray-400 mt-2">Non disponible en mode démo.</p>}
      </Card>

      {/* ─── Virement bancaire ─── */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-brand-700" /> Virement bancaire (RIB)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Vos coordonnées bancaires seront envoyées par email aux clients avec le montant exact et une référence de paiement.
        </p>
        <div className="space-y-3 mb-4">
          <Input
            label="Titulaire du compte"
            value={bankHolder}
            onChange={e => setBankHolder(e.target.value)}
            placeholder="Ex : Kira Voyages SARL"
          />
          <Input
            label="Nom de la banque"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            placeholder="Ex : Banque de Tunisie"
          />
          <Input
            label="IBAN"
            value={bankIban}
            onChange={e => setBankIban(e.target.value)}
            placeholder="Ex : TN5901234567890123456789"
          />
          <Input
            label="BIC / SWIFT"
            value={bankBic}
            onChange={e => setBankBic(e.target.value)}
            placeholder="Ex : BTUNTNTTXXX"
          />
        </div>
        <Button onClick={handleSaveBank} loading={savingBank} disabled={isDemoMode}>
          Enregistrer les coordonnées
        </Button>
        {isDemoMode && <p className="text-xs text-gray-400 mt-2">Non disponible en mode démo.</p>}
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

      {/* Avis clients */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Star className="h-4 w-4 text-brand-700" /> Avis clients
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Un email est envoyé automatiquement au client le lendemain de son départ. Si un lien est renseigné ici, un bouton "Laisser un avis" apparaît dans cet email.
        </p>
        <Input
          label="Lien pour recevoir des avis"
          value={reviewLink}
          onChange={e => setReviewLink(e.target.value)}
          placeholder="https://g.page/votre-page ou lien Instagram, TripAdvisor…"
          disabled={isDemoMode}
        />
        <p className="text-xs text-gray-400 mt-1.5 mb-4">
          Fonctionne avec Google Business, Facebook, TripAdvisor, Instagram, ou tout autre lien.
        </p>
        <Button onClick={handleSaveReviewLink} loading={savingReview} disabled={isDemoMode}>
          Enregistrer le lien
        </Button>
        {isDemoMode && <p className="text-xs text-gray-400 mt-2">Non disponible en mode démo.</p>}
      </Card>

      {/* ─── Personnalisation de marque ─── */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Palette className="h-4 w-4 text-brand-700" /> Personnalisation de marque
          </h2>
          <button
            onClick={handleResetBrand}
            disabled={isDemoMode}
            title="Revenir aux couleurs VillaHub"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Réinitialiser
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Appliqué à votre tableau de bord et à votre catalogue public. Si non renseigné, les couleurs VillaHub par défaut sont utilisées.
        </p>

        <div className="space-y-5">
          {/* Colours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur principale</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandPrimary || '#7A8F58'}
                  onChange={e => setBrandPrimary(e.target.value)}
                  disabled={isDemoMode}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 disabled:opacity-50"
                />
                <input
                  type="text"
                  value={brandPrimary}
                  onChange={e => setBrandPrimary(e.target.value)}
                  placeholder="#7A8F58"
                  maxLength={7}
                  disabled={isDemoMode}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Couleur secondaire <span className="font-normal text-gray-400">(optionnel)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandSecondary || '#07BEB8'}
                  onChange={e => setBrandSecondary(e.target.value)}
                  disabled={isDemoMode}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 disabled:opacity-50"
                />
                <input
                  type="text"
                  value={brandSecondary}
                  onChange={e => setBrandSecondary(e.target.value)}
                  placeholder="#07BEB8"
                  maxLength={7}
                  disabled={isDemoMode}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Font */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Police de caractères</label>
            <select
              value={brandFont}
              onChange={e => setBrandFont(e.target.value)}
              disabled={isDemoMode}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
            >
              {BRAND_FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {brandFont && brandFont !== 'Inter' && (
              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: `'${brandFont}', sans-serif` }}>
                Aperçu : Villa Djerba — Séjour de rêve en bord de mer
              </p>
            )}
          </div>

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setBrandPreview(v => !v)}
            className="flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-900 font-medium transition-colors"
          >
            <Eye className="h-4 w-4" />
            {brandPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}
          </button>

          {brandPreview && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b bg-gray-100">
                Aperçu — tableau de bord &amp; catalogue
              </div>
              <div className="flex h-44">
                {/* Mini sidebar */}
                <div
                  className="w-28 flex flex-col px-2 py-3 gap-1 flex-shrink-0"
                  style={{ backgroundColor: brandPrimary || '#7A8F58', fontFamily: brandFont !== 'Inter' ? `'${brandFont}', sans-serif` : undefined }}
                >
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    {tenant?.logo_url
                      ? <img src={tenant.logo_url} className="w-5 h-5 rounded object-cover" alt="" />
                      : <div className="w-5 h-5 rounded bg-white/20 flex-shrink-0" />
                    }
                    <div className="text-white text-[9px] font-semibold truncate">VillaHub</div>
                  </div>
                  {['Tableau de bord', 'Réservations', 'Calendrier', 'Paramètres'].map(item => (
                    <div key={item} className="h-6 rounded flex items-center px-1.5 gap-1.5 bg-white/15">
                      <div className="w-2 h-2 rounded-sm bg-white/60 flex-shrink-0" />
                      <span className="text-white text-[8px] truncate">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Mini catalogue card */}
                <div
                  className="flex-1 p-3 bg-[#F5F0E8] flex flex-col gap-2"
                  style={{ fontFamily: brandFont !== 'Inter' ? `'${brandFont}', sans-serif` : undefined }}
                >
                  <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Catalogue public</div>
                  <div className="bg-white rounded-lg p-2 shadow-sm flex flex-col gap-1">
                    <div className="h-10 rounded bg-gray-200" />
                    <div className="text-[9px] font-bold text-gray-800">Villa Al Baraka</div>
                    <div className="text-[8px] text-gray-400">Midoun · 8 pers.</div>
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: brandPrimary || '#7A8F58' }}
                    >
                      850 TND<span className="font-normal text-gray-400 text-[8px]">/nuit</span>
                    </div>
                    <div
                      className="text-white text-[8px] font-medium px-2 py-0.5 rounded-md text-center"
                      style={{ backgroundColor: brandPrimary || '#7A8F58' }}
                    >
                      Réserver →
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button onClick={handleSaveBrand} loading={savingBrand} disabled={isDemoMode}>
            Enregistrer la personnalisation
          </Button>
        </div>
        {isDemoMode && <p className="text-xs text-gray-400 mt-2">Non disponible en mode démo.</p>}
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
