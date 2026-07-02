import { useEffect, useState } from 'react'
import { Home, ChevronRight, Check, Phone, Mail, Globe } from 'lucide-react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { useVillasStore } from '@/stores/villas.store'
import { useReservationsStore } from '@/stores/reservations.store'
import { usePricingStore } from '@/stores/pricing.store'
import { useAuthStore } from '@/stores/auth.store'
import { AMENITY_OPTIONS } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import type { Villa } from '@/types'
import toast from 'react-hot-toast'

const today = format(new Date(), 'yyyy-MM-dd')
const defaultOut = format(addDays(new Date(), 7), 'yyyy-MM-dd')

type Step = 'search' | 'villa' | 'form' | 'confirm'

interface BookingForm {
  full_name: string
  email: string
  phone: string
  nationality: string
  guests: number
  note: string
}

export default function BookingPage() {
  const { villas, fetch: fetchVillas } = useVillasStore()
  const { fetch: fetchRes, add, checkConflict } = useReservationsStore()
  const { fetch: fetchRates, computePrice } = usePricingStore()
  const { enterDemoMode } = useAuthStore()
  const { fmt } = useCurrency()

  const [step, setStep] = useState<Step>('search')
  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(defaultOut)
  const [guests, setGuests] = useState(2)
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null)
  const [form, setForm] = useState<BookingForm>({ full_name: '', email: '', phone: '', nationality: '', guests: 2, note: '' })
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  useEffect(() => {
    enterDemoMode()
    fetchVillas()
    fetchRes()
    fetchRates()
  }, [])

  const nights = Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))

  const availableVillas = villas.filter(v => {
    if (v.status !== 'active') return false
    if (v.capacity < guests) return false
    if (!checkIn || !checkOut || checkIn >= checkOut) return false
    return !checkConflict(v.id, checkIn, checkOut)
  })

  function selectVilla(villa: Villa) {
    setSelectedVilla(villa)
    setForm(f => ({ ...f, guests }))
    setStep('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function computedPrice(villa: Villa) {
    const pricePerNight = computePrice(villa.base_price, parseISO(checkIn))
    return pricePerNight * nights
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVilla) return
    setLoading(true)
    try {
      const total = computedPrice(selectedVilla)
      await add({
        villa_id: selectedVilla.id,
        check_in: checkIn,
        check_out: checkOut,
        check_in_time: '14:00',
        check_out_time: '11:00',
        guests: form.guests,
        total_amount: total,
        currency: 'TND',
        source: 'direct',
        status: 'pending',
        client_id: null,
        ical_uid: null,
        internal_note: form.note || null,
        client: {
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          nationality: form.nationality || null,
        },
      })
      const ref = 'PMS-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      setBookingRef(ref)
      setConfirmed(true)
      setStep('confirm')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Erreur lors de la réservation. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (step === 'confirm' && confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-success-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demande envoyée !</h1>
            <p className="text-gray-500 mt-2">Nous confirmons votre réservation sous 24h par email ou téléphone.</p>
          </div>
          <Card className="text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Référence</span>
              <span className="font-bold text-brand-800">{bookingRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Villa</span>
              <span className="font-medium">{selectedVilla?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Arrivée</span>
              <span className="font-medium">{format(parseISO(checkIn), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Départ</span>
              <span className="font-medium">{format(parseISO(checkOut), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-500 text-sm">Montant estimé</span>
              <span className="font-bold text-gray-900">{fmt(computedPrice(selectedVilla!))}</span>
            </div>
          </Card>
          <div className="flex flex-col gap-3">
            <a href="tel:+21671000000" className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-700 hover:border-brand-400 transition-colors">
              <Phone className="h-4 w-4 text-brand-700" /> Appeler l'agence
            </a>
            <button onClick={() => { setStep('search'); setConfirmed(false) }}
              className="text-sm text-gray-400 hover:text-gray-600">
              Faire une nouvelle recherche
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form screen ──────────────────────────────────────────────────────────
  if (step === 'form' && selectedVilla) {
    const total = computedPrice(selectedVilla)
    const pricePerNight = computePrice(selectedVilla.base_price, parseISO(checkIn))

    return (
      <div className="min-h-screen bg-gray-50">
        <BookingHeader />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => setStep('search')} className="hover:text-brand-700">Recherche</button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-800 font-medium">Vos informations</span>
          </div>

          {/* Summary card */}
          <Card className="flex gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🏖️</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900">{selectedVilla.name}</h2>
              <p className="text-sm text-gray-500">{format(parseISO(checkIn), 'dd MMM', { locale: fr })} → {format(parseISO(checkOut), 'dd MMM yyyy', { locale: fr })} · {nights} nuits · {form.guests} pers.</p>
              <p className="mt-1.5 font-bold text-brand-800 text-lg">{fmt(total)}</p>
              <p className="text-xs text-gray-400">{fmt(pricePerNight)}/nuit × {nights} nuits</p>
            </div>
          </Card>

          {/* Form */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-5">Vos coordonnées</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nom complet *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Mohamed Ben Ali" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Téléphone *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="+216 XX XXX XXX" left={<Phone className="h-3.5 w-3.5" />} />
                <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="votre@email.com" left={<Mail className="h-3.5 w-3.5" />} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nationalité" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Tunisienne" left={<Globe className="h-3.5 w-3.5" />} />
                <Input label="Nombre de personnes" type="number" min={1} max={selectedVilla.capacity} value={form.guests} onChange={e => setForm(f => ({ ...f, guests: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Heure d'arrivée prévue, demandes spéciales…"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                💡 Votre demande sera confirmée sous 24h. Aucun paiement requis maintenant.
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full">
                Envoyer ma demande de réservation
              </Button>
            </form>
          </Card>

          <p className="text-center text-xs text-gray-400">Paiement sécurisé à la confirmation · Annulation flexible</p>
        </div>
      </div>
    )
  }

  // ── Search + results ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <BookingHeader />

      {/* Hero search */}
      <div className="bg-brand-800 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Villas à Djerba</h1>
          <p className="text-brand-200">Réservez directement — sans intermédiaire, meilleur prix garanti</p>
        </div>
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-4 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Arrivée</label>
              <input type="date" value={checkIn} min={today} onChange={e => setCheckIn(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Départ</label>
              <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Voyageurs</label>
              <input type="number" min={1} max={20} value={guests} onChange={e => setGuests(+e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <Button size="lg" className="w-full self-end" onClick={() => setStep('search')}>
              Rechercher
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {checkIn && checkOut && checkIn < checkOut ? (
          <>
            <h2 className="font-semibold text-gray-900 mb-1">
              {availableVillas.length} villa(s) disponible(s)
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {format(parseISO(checkIn), 'dd MMM', { locale: fr })} → {format(parseISO(checkOut), 'dd MMM yyyy', { locale: fr })} · {nights} nuit{nights > 1 ? 's' : ''} · {guests} pers.
            </p>

            {availableVillas.length === 0 ? (
              <Card className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-4">😔</p>
                <p className="font-medium text-gray-600">Aucune villa disponible pour ces dates.</p>
                <p className="text-sm mt-1">Essayez d'autres dates ou contactez-nous directement.</p>
                <a href="tel:+21671000000" className="inline-flex items-center gap-2 mt-4 text-brand-700 font-medium hover:underline">
                  <Phone className="h-4 w-4" /> Appeler l'agence
                </a>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableVillas.map(villa => {
                  const total = computedPrice(villa)
                  const pricePerNight = computePrice(villa.base_price, parseISO(checkIn))
                  return (
                    <div key={villa.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-44 bg-gradient-to-br from-brand-100 to-brand-200 relative flex items-center justify-center">
                        <span className="text-5xl">🏖️</span>
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-white/90 text-brand-800 text-xs font-semibold px-2 py-1 rounded-full">
                            {villa.capacity} pers. max
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-gray-900">{villa.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{villa.description}</p>

                        {/* Quick stats */}
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>🛏 {villa.bedrooms} ch.</span>
                          <span>🚿 {villa.bathrooms} sdb</span>
                          <span>👥 {villa.capacity} pers.</span>
                        </div>

                        {/* Amenities icons */}
                        <div className="flex flex-wrap gap-1">
                          {villa.amenities.slice(0, 5).map(aid => {
                            const a = AMENITY_OPTIONS.find(o => o.id === aid)
                            return a ? <span key={aid} className="text-base" title={a.label}>{a.icon}</span> : null
                          })}
                        </div>

                        <div className="border-t pt-3 flex items-center justify-between">
                          <div>
                            <p className="text-xl font-bold text-gray-900">{fmt(pricePerNight)}<span className="text-xs font-normal text-gray-400">/nuit</span></p>
                            <p className="text-xs text-gray-500">Total : {fmt(total)} ({nights} nuits)</p>
                          </div>
                          <Button onClick={() => selectVilla(villa)} size="sm">
                            Réserver
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-400 py-12">Choisissez vos dates pour voir les villas disponibles.</p>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-brand-900 text-brand-200 text-center py-8 px-4 mt-12">
        <p className="font-bold text-white text-lg mb-1">Agence Djerba Villas</p>
        <p className="text-sm">📞 +216 71 000 000 · ✉️ contact@djerba-villas.tn</p>
        <p className="text-xs mt-3 text-brand-400">Propulsé par VillaHub</p>
      </footer>
    </div>
  )
}

function BookingHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center">
          <Home className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-brand-800">Djerba Villas</span>
      </div>
      <a href="tel:+21671000000"
        className="flex items-center gap-1.5 text-sm text-brand-700 font-medium border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
        <Phone className="h-3.5 w-3.5" /> Nous appeler
      </a>
    </header>
  )
}
