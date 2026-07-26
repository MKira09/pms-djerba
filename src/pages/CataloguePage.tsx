import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, BedDouble, ArrowRight, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Villa } from '@/types'
import PhotoCarousel from '@/components/ui/PhotoCarousel'
import { useCatalogCurrency } from '@/hooks/useCatalogCurrency'
import CurrencySelector from '@/components/catalogue/CurrencySelector'
import BrandStyle from '@/components/brand/BrandStyle'

const SAND = '#F5F0E8'
const DARK = '#0D1F2D'
const DEFAULT_TEAL = '#07BEB8'

type TenantPublic = {
  id: string
  name: string
  logo_url: string | null
  slogan: string | null
  currency: string | null
  slug: string | null
  brand_color_primary: string | null
  brand_color_secondary: string | null
  brand_font: string | null
}

export default function CataloguePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [villas, setVillas] = useState<Villa[]>([])
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [checking, setChecking] = useState(false)

  const { displayCurrency, setDisplayCurrency, formatAmount, rateLoading, isConverted } =
    useCatalogCurrency(tenant?.currency ?? 'TND')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: t } = await supabase
        .from('tenants')
        .select('id, name, logo_url, slogan, currency, slug, brand_color_primary, brand_color_secondary, brand_font')
        .eq('slug', tenantSlug!)
        .single()
      if (!t) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setTenant(t as TenantPublic)
      const { data: v } = await supabase
        .from('villas')
        .select('*')
        .eq('tenant_id', t.id)
        .eq('status', 'active')
        .order('name')
      setVillas(v ?? [])
      setLoading(false)
    }
    if (tenantSlug) load()
  }, [tenantSlug])

  useEffect(() => {
    if (!checkIn || !checkOut || !tenant) {
      setUnavailableIds(new Set())
      return
    }
    if (checkIn >= checkOut) return
    setChecking(true)
    supabase
      .from('reservations')
      .select('villa_id')
      .eq('tenant_id', tenant.id)
      .in('status', ['confirmed', 'pending'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .then(({ data }) => {
        setUnavailableIds(new Set((data ?? []).map((r: { villa_id: string }) => r.villa_id)))
        setChecking(false)
      })
  }, [checkIn, checkOut, tenant])

  const primaryColor = tenant?.brand_color_primary ?? DEFAULT_TEAL

  const today = new Date().toISOString().split('T')[0]
  const datesSelected = !!(checkIn && checkOut && checkIn < checkOut)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: SAND }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4" style={{ background: SAND }}>
        <Home className="h-12 w-12 opacity-20" style={{ color: DARK }} />
        <h1 className="text-2xl font-bold" style={{ color: DARK }}>Catalogue introuvable</h1>
        <p className="text-gray-500">Ce lien de catalogue n'existe pas ou a été modifié.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: SAND }}>
      <BrandStyle
        primary={tenant?.brand_color_primary}
        secondary={tenant?.brand_color_secondary}
        font={tenant?.brand_font}
      />
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 rounded-xl object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: primaryColor }}>
              <Home className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate" style={{ color: DARK }}>{tenant?.name}</p>
            {tenant?.slogan && (
              <p className="text-sm text-gray-500 leading-tight truncate">{tenant.slogan}</p>
            )}
          </div>
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
            loading={rateLoading}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Date filter */}
        <div className="bg-white rounded-2xl shadow-md px-5 py-4 mb-8 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Arrivée</label>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={e => {
                setCheckIn(e.target.value)
                if (checkOut && e.target.value >= checkOut) setCheckOut('')
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#07BEB8] focus:ring-1 focus:ring-[#07BEB8]"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Départ</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn ? checkIn : today}
              onChange={e => setCheckOut(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#07BEB8] focus:ring-1 focus:ring-[#07BEB8]"
            />
          </div>
          {(checkIn || checkOut) && (
            <button
              onClick={() => { setCheckIn(''); setCheckOut(''); setUnavailableIds(new Set()) }}
              className="shrink-0 text-sm text-gray-400 hover:text-gray-600 underline pb-1"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {datesSelected
              ? `${villas.filter(v => !unavailableIds.has(v.id)).length} villa${villas.filter(v => !unavailableIds.has(v.id)).length !== 1 ? 's' : ''} disponible${villas.filter(v => !unavailableIds.has(v.id)).length !== 1 ? 's' : ''} sur ${villas.length}`
              : `${villas.length} villa${villas.length !== 1 ? 's' : ''}`}
          </p>
          {checking && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-gray-400 border-t-transparent animate-spin inline-block" />
              Vérification des disponibilités…
            </span>
          )}
        </div>

        {/* Villa grid */}
        {villas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {villas.map(villa => {
              const isUnavailable = datesSelected && unavailableIds.has(villa.id)

              return (
                <div
                  key={villa.id}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden flex flex-col transition-shadow ${isUnavailable ? 'opacity-60' : 'hover:shadow-lg'}`}
                >
                  {/* Photo */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden group">
                    {(villa.photos ?? []).length > 0 ? (
                      <PhotoCarousel photos={villa.photos} villaName={villa.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: SAND }}>
                        <Home className="h-10 w-10 opacity-20" style={{ color: DARK }} />
                      </div>
                    )}
                    {datesSelected && (
                      <span
                        className="absolute top-3 right-3 z-20 text-xs font-bold px-3 py-1 rounded-full shadow pointer-events-none"
                        style={{
                          background: isUnavailable ? '#e5e7eb' : primaryColor,
                          color: isUnavailable ? '#6b7280' : 'white',
                        }}
                      >
                        {isUnavailable ? 'Indisponible' : 'Disponible'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h2 className="font-bold text-base leading-snug" style={{ color: DARK }}>
                      {villa.name}
                    </h2>
                    {villa.city && (
                      <p className="text-xs text-gray-400">{villa.city}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {villa.capacity} pers.
                      </span>
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" />
                        {villa.bedrooms} ch.
                      </span>
                    </div>

                    <p className="font-bold text-lg mt-auto pt-2" style={{ color: primaryColor }}>
                      {isConverted ? '≈ ' : ''}{formatAmount(villa.base_price)}
                      <span className="text-sm font-normal text-gray-400"> /nuit</span>
                    </p>

                    {isUnavailable ? (
                      <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-gray-100 text-gray-400">
                        Indisponible
                      </div>
                    ) : (
                      <Link
                        to={`/book/${villa.id}`}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                        style={{ background: primaryColor }}
                      >
                        Réserver <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Aucune villa disponible</p>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-gray-400 py-8 mt-4">
        Propulsé par{' '}
        <span className="font-semibold" style={{ color: primaryColor }}>VillaHub</span>
      </footer>
    </div>
  )
}
