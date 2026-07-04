import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  format, parseISO, addDays, isBefore, isWithinInterval,
  startOfDay, getDaysInMonth, getDay, addMonths, startOfMonth,
  differenceInDays,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Users, Bed, Bath, MapPin, Home, ChevronLeft, ChevronRight, Check } from 'lucide-react'

type VillaInfo = {
  id: string; name: string; description: string | null; city: string
  capacity: number; bedrooms: number; bathrooms: number
  base_price: number; photos: string[]; tenant_id: string
}
type BlockedRange = { check_in: string; check_out: string }
type Form = {
  firstName: string; lastName: string; phone: string; email: string
  checkIn: string; checkOut: string; guests: number; message: string
}

const EMPTY_FORM: Form = {
  firstName: '', lastName: '', phone: '', email: '',
  checkIn: '', checkOut: '', guests: 1, message: '',
}

const DOW = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function CalendarMonth({
  month, blocked, checkIn, checkOut, onDayClick,
}: {
  month: Date
  blocked: BlockedRange[]
  checkIn?: string
  checkOut?: string
  onDayClick?: (dateStr: string) => void
}) {
  const today = startOfDay(new Date())
  const first = startOfMonth(month)
  const days = getDaysInMonth(month)
  const offset = (getDay(first) + 6) % 7

  return (
    <div>
      <p className="text-center text-sm font-semibold text-gray-800 mb-3 capitalize">
        {format(month, 'MMMM yyyy', { locale: fr })}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-xs">
        {DOW.map(d => (
          <div key={d} className="text-center font-medium text-gray-400 pb-1">{d}</div>
        ))}
        {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1)
          const dateStr = format(date, 'yyyy-MM-dd')
          const past = isBefore(date, today)
          const booked = blocked.some(r =>
            isWithinInterval(date, {
              start: parseISO(r.check_in),
              end: addDays(parseISO(r.check_out), -1),
            })
          )
          const isStart = dateStr === checkIn
          const isEnd = dateStr === checkOut
          const inRange = !!(checkIn && checkOut && dateStr > checkIn && dateStr < checkOut)
          const clickable = !past && !booked

          return (
            <div
              key={i}
              onClick={() => clickable && onDayClick?.(dateStr)}
              className={[
                'text-center py-1.5 rounded select-none transition-colors',
                clickable ? 'cursor-pointer' : 'cursor-default',
                isStart || isEnd
                  ? 'bg-brand-800 text-white font-semibold'
                  : inRange
                    ? 'bg-teal-100 text-teal-800'
                    : past
                      ? 'text-gray-300'
                      : booked
                        ? 'bg-orange-100 text-orange-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
            >
              {i + 1}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function VillaBookingPage() {
  const { villaId } = useParams<{ villaId: string }>()
  const [villa, setVilla] = useState<VillaInfo | null>(null)
  const [blocked, setBlocked] = useState<BlockedRange[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()))
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    if (!villaId) return
    Promise.all([
      supabase
        .from('villas')
        .select('id,name,description,city,capacity,bedrooms,bathrooms,base_price,photos,tenant_id')
        .eq('id', villaId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('reservations')
        .select('check_in,check_out')
        .eq('villa_id', villaId)
        .eq('status', 'confirmed'),
    ]).then(([{ data: v }, { data: r }]) => {
      if (!v) setNotFound(true)
      else setVilla(v)
      setBlocked(r ?? [])
      setLoading(false)
    })
  }, [villaId])

  function handleDayClick(dateStr: string) {
    setError('')
    if (!form.checkIn || form.checkOut) {
      setForm(f => ({ ...f, checkIn: dateStr, checkOut: '' }))
    } else if (dateStr > form.checkIn) {
      setForm(f => ({ ...f, checkOut: dateStr }))
    } else {
      setForm(f => ({ ...f, checkIn: dateStr, checkOut: '' }))
    }
  }

  function setField(k: keyof Form, v: string | number) {
    setForm(f => ({ ...f, [k]: v }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!villa) return

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Prénom et nom requis.'); return
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Téléphone ou email requis.'); return
    }
    if (!form.checkIn || !form.checkOut) {
      setError('Veuillez sélectionner les dates d\'arrivée et de départ.'); return
    }
    if (form.checkIn >= form.checkOut) {
      setError('La date de départ doit être après la date d\'arrivée.'); return
    }
    if (isBefore(parseISO(form.checkIn), startOfDay(new Date()))) {
      setError('La date d\'arrivée ne peut pas être dans le passé.'); return
    }

    const cin = parseISO(form.checkIn)
    const cout = addDays(parseISO(form.checkOut), -1)
    const overlap = blocked.some(r =>
      isWithinInterval(cin, { start: parseISO(r.check_in), end: addDays(parseISO(r.check_out), -1) }) ||
      isWithinInterval(cout, { start: parseISO(r.check_in), end: addDays(parseISO(r.check_out), -1) })
    )
    if (overlap) {
      setError('Ces dates sont déjà réservées. Veuillez en choisir d\'autres.'); return
    }

    setSubmitting(true)
    const { error: rpcErr } = await supabase.rpc('create_booking_request', {
      p_villa_id:  villa.id,
      p_full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      p_email:     form.email.trim() || '',
      p_phone:     form.phone.trim() || '',
      p_check_in:  form.checkIn,
      p_check_out: form.checkOut,
      p_guests:    form.guests,
      p_message:   form.message.trim() || '',
    })
    setSubmitting(false)

    if (rpcErr) {
      console.error('[booking]', rpcErr)
      setError('Erreur lors de l\'envoi. Veuillez réessayer.')
    } else {
      setSubmitted(true)
    }
  }

  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const photos = villa?.photos ?? []
  const nights = form.checkIn && form.checkOut
    ? Math.max(0, differenceInDays(parseISO(form.checkOut), parseISO(form.checkIn)))
    : 0
  const basePrice = villa ? Number(villa.base_price) : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sable">
      <div className="w-8 h-8 rounded-full border-2 border-brand-800 border-t-transparent animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8 bg-sable">
      <span className="text-6xl">🏖️</span>
      <h1 className="text-2xl font-bold text-gray-800">Villa introuvable</h1>
      <p className="text-gray-500">Ce lien n'est plus valide ou la villa n'est pas disponible à la réservation.</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-8 bg-sable">
      <div className="w-16 h-16 rounded-full bg-brand-800 flex items-center justify-center shadow-lg">
        <Check className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Demande envoyée !</h1>
        <p className="text-gray-600 max-w-sm">
          Votre demande pour <strong>{villa?.name}</strong> a bien été reçue.
          Le propriétaire vous contactera rapidement pour confirmer.
        </p>
      </div>
      <div className="bg-white rounded-xl px-6 py-4 text-sm text-gray-600 space-y-1 shadow-sm">
        <p>📅 Arrivée : <strong>{format(parseISO(form.checkIn), 'dd MMMM yyyy', { locale: fr })}</strong></p>
        <p>📅 Départ : <strong>{format(parseISO(form.checkOut), 'dd MMMM yyyy', { locale: fr })}</strong></p>
        <p>👥 {form.guests} personne{form.guests > 1 ? 's' : ''}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sable">
      {/* Header */}
      <header className="bg-brand-800 text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Home className="h-4 w-4" />
        </div>
        <span className="font-semibold">Réservation en ligne</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Villa card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Photos */}
          {photos.length > 0 ? (
            <div className="relative h-60 sm:h-72">
              <img src={photos[photoIdx]} alt={villa?.name} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.slice(0, 6).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-52 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
              <span className="text-6xl">🏖️</span>
            </div>
          )}

          <div className="p-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{villa?.name}</h1>
              {villa?.city && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" /> {villa.city}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {villa?.capacity} pers. max</span>
              <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {villa?.bedrooms} ch.</span>
              <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {villa?.bathrooms} SDB</span>
              {villa?.base_price ? (
                <span className="font-semibold text-brand-800">{villa.base_price} TND<span className="font-normal text-gray-400">/nuit</span></span>
              ) : null}
            </div>

            {villa?.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{villa.description}</p>
            )}
          </div>
        </div>

        {/* Availability calendar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Disponibilités</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-brand-800 inline-block" /> Sélectionné
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200 inline-block" /> Indisponible
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Disponible
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalMonth(m => addMonths(m, -1))}
                disabled={!isBefore(startOfMonth(new Date()), calMonth)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCalMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <CalendarMonth
              month={calMonth} blocked={blocked}
              checkIn={form.checkIn} checkOut={form.checkOut}
              onDayClick={handleDayClick}
            />
            <div className="hidden sm:block">
              <CalendarMonth
                month={addMonths(calMonth, 1)} blocked={blocked}
                checkIn={form.checkIn} checkOut={form.checkOut}
                onDayClick={handleDayClick}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-center text-gray-400">
            {!form.checkIn
              ? "Cliquez sur une date d'arrivée"
              : !form.checkOut
                ? 'Cliquez maintenant sur la date de départ'
                : `Arrivée ${format(parseISO(form.checkIn), 'dd MMM', { locale: fr })} → Départ ${format(parseISO(form.checkOut), 'dd MMM', { locale: fr })}`
            }
          </p>
        </div>

        {/* Booking form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-5">Votre demande de réservation</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                <input
                  required
                  value={form.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                <input
                  required
                  value={form.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  placeholder="Votre nom"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="+XX XXX XXX XXX"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="client@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">Au moins un moyen de contact requis.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrivée *</label>
                <input
                  required
                  type="date"
                  min={todayStr}
                  value={form.checkIn}
                  onChange={e => setField('checkIn', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Départ *</label>
                <input
                  required
                  type="date"
                  min={form.checkIn || todayStr}
                  value={form.checkOut}
                  onChange={e => setField('checkOut', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Price summary */}
            {nights > 0 && basePrice > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3.5 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {basePrice} TND / nuit × {nights} nuit{nights > 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-gray-900">{basePrice * nights} TND</span>
                </div>
                <p className="text-xs text-teal-600">
                  Estimation basée sur le tarif de base — le propriétaire vous confirmera le montant définitif.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de personnes *</label>
              <input
                required
                type="number"
                min={1}
                max={villa?.capacity ?? 20}
                value={form.guests}
                onChange={e => setField('guests', +e.target.value)}
                className="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="font-normal text-gray-400">(optionnel)</span></label>
              <textarea
                rows={3}
                value={form.message}
                onChange={e => setField('message', e.target.value)}
                placeholder="Occasion spéciale, animaux de compagnie, arrivée tardive…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-900 text-white font-semibold py-3.5 rounded-lg hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {submitting ? 'Envoi en cours…' : 'Demander cette réservation →'}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Aucun paiement requis à ce stade. Le propriétaire examinera votre demande et vous contactera pour confirmer.
            </p>
          </form>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400">
        Propulsé par VillaHub
      </footer>
    </div>
  )
}
