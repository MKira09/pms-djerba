import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowRight, Copy, CheckCheck, ExternalLink, PartyPopper } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useAuthStore } from '@/stores/auth.store'
import { useVillasStore } from '@/stores/villas.store'
import { usePropertyTerm, PROPERTY_TYPE_LIST } from '@/hooks/usePropertyTerm'
import { toSlug } from '@/lib/utils'
import type { Villa } from '@/types'

type Step = 'welcome' | 'villa' | 'done'

const EMPTY_VILLA: Omit<Villa, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  name: '', description: '', address: '', city: 'Djerba',
  capacity: 4, bedrooms: 2, bathrooms: 1, base_price: 300,
  status: 'active', amenities: [], access_code: '', arrival_info: '', photos: [],
  wifi_network: '', wifi_password: '', contact_numbers: [],
  property_type: null, color: null, slug: null,
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ['welcome', 'villa', 'done']
  const idx = order.indexOf(step)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {order.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i === idx ? 'w-8 bg-brand-700' : i < idx ? 'w-4 bg-brand-400' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

function Shell({ step, children }: { step: Step; children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-2xl mb-3 shadow-lg">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">VillaHub</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <StepDots step={step} />
          {children}
        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-gray-400 mt-5">
            <button onClick={() => navigate('/dashboard')} className="hover:text-gray-600 hover:underline">
              Plus tard, j'irai directement sur mon tableau de bord
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, tenant, isDemoMode } = useAuthStore()
  const { villas, loading: villasLoading, fetch: fetchVillas, add } = useVillasStore()
  const { singular, isMultiType, types } = usePropertyTerm()
  const [step, setStep] = useState<Step>('welcome')

  // Si ce compte a déjà au moins un bien (ex: retour manuel sur /onboarding
  // après coup), pas besoin du parcours d'accueil — direction le dashboard.
  useEffect(() => { fetchVillas() }, [])
  useEffect(() => {
    if (!isDemoMode && !villasLoading && villas.length > 0) {
      navigate('/dashboard', { replace: true })
    }
  }, [isDemoMode, villasLoading, villas.length, navigate])
  const [createdVilla, setCreatedVilla] = useState<Villa | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [form, setForm] = useState({
    name: '',
    property_type: types[0] ?? 'Villa',
    city: 'Djerba',
    capacity: 4,
    base_price: 300,
  })

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? ''
  const typeOpts = (isMultiType ? types : PROPERTY_TYPE_LIST).map(t => ({ value: t, label: t }))
  const catalogueUrl = tenant?.slug ? `${window.location.origin}/catalogue/${tenant.slug}` : null

  async function handleCreateVilla(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(`Donnez un nom à votre ${singular.toLowerCase()}.`); return }
    setSaving(true)
    try {
      const villa = await add({
        ...EMPTY_VILLA,
        name: form.name.trim(),
        property_type: form.property_type,
        city: form.city.trim() || 'Djerba',
        capacity: form.capacity,
        base_price: form.base_price,
        slug: toSlug(form.name.trim()),
      })
      setCreatedVilla(villa)
      setStep('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Erreur lors de la création : ' + msg)
    } finally {
      setSaving(false)
    }
  }

  function handleCopyLink() {
    if (!catalogueUrl) return
    navigator.clipboard.writeText(catalogueUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  return (
    <Shell step={step}>
      {step === 'welcome' && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue{firstName ? `, ${firstName}` : ''} !
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Configurons votre première {singular.toLowerCase()} en deux minutes — vous aurez ensuite
            un catalogue prêt à partager à vos clients pour recevoir vos premières réservations.
          </p>
          <Button size="lg" className="w-full" onClick={() => setStep('villa')}>
            Commencer <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === 'villa' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Votre première {singular.toLowerCase()}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Juste l'essentiel pour commencer — vous pourrez compléter photos, équipements et détails plus tard depuis "Mes biens".
          </p>
          <form onSubmit={handleCreateVilla} className="space-y-4">
            <Input
              label={`Nom de la ${singular.toLowerCase()}`}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Villa Jasmine"
              required
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type de bien"
                value={form.property_type}
                onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
                options={typeOpts}
              />
              <Input
                label="Ville"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Djerba"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Capacité (personnes)"
                type="number"
                min={1}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))}
              />
              <Input
                label="Prix par nuit"
                type="number"
                min={0}
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: +e.target.value }))}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={saving}>
              Créer ma {singular.toLowerCase()} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-success-100 rounded-2xl mb-4">
            <PartyPopper className="h-7 w-7 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {createdVilla?.name ?? 'Votre villa'} est prête !
          </h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Voici le lien de votre catalogue — partagez-le à vos clients pour qu'ils puissent
            consulter vos disponibilités et réserver directement.
          </p>

          {catalogueUrl && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-brand-800 mb-1">Votre catalogue public</p>
              <p className="text-sm text-brand-700 font-mono break-all mb-3">{catalogueUrl}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-white border border-brand-200 hover:border-brand-500 text-brand-700 transition-colors"
                >
                  {copiedLink ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'Copié !' : 'Copier le lien'}
                </button>
                <a
                  href={catalogueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-brand-800 text-white hover:bg-brand-900 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Voir le catalogue
                </a>
              </div>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
            Aller sur mon tableau de bord <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </Shell>
  )
}
