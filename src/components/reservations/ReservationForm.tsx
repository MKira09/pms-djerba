import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { useReservationsStore } from '@/stores/reservations.store'
import { useVillasStore } from '@/stores/villas.store'
import { usePricingStore } from '@/stores/pricing.store'
import { useAuthStore } from '@/stores/auth.store'
import { useExtrasStore } from '@/stores/extras.store'
import { useBlacklistStore } from '@/stores/blacklist.store'
import { nightCount } from '@/lib/utils'
import type { ReservationSource, ReservationStatus, Reservation, Extra } from '@/types'
import { parseISO, addDays, format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

const SOURCES: ReservationSource[] = ['airbnb', 'booking', 'direct', 'whatsapp', 'vrbo', 'autre']
const STATUSES: ReservationStatus[] = ['confirmed', 'pending', 'cancelled', 'checkout']
const OCCASIONS = ['Vacances en famille', 'Lune de miel', 'Entre amis', 'Voyage d\'affaires', 'Autre']
const DEPOSIT_METHODS = [
  { value: 'espèces', label: '💵 Espèces' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'chèque', label: '📄 Chèque' },
  { value: 'carte', label: '💳 Carte' },
]

type PaymentStatus = 'unpaid' | 'partial' | 'paid'
function getPaymentStatus(deposit: number, total: number): PaymentStatus {
  if (deposit <= 0 || total === 0) return 'unpaid'
  if (deposit >= total) return 'paid'
  return 'partial'
}
const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid:  { label: 'Non payé',      cls: 'bg-red-100 text-red-700' },
  partial: { label: 'Acompte versé', cls: 'bg-orange-100 text-orange-700' },
  paid:    { label: 'Payé',          cls: 'bg-green-100 text-green-700' },
}

interface Props {
  open: boolean
  reservation?: Reservation | null
  defaultDate?: string | null
  onClose: () => void
}

interface FormData {
  villa_id: string
  check_in: string
  check_out: string
  check_in_time: string
  check_out_time: string
  extras: Extra[]
  adults: number
  children: number
  guests: number
  occasion: string
  has_pets: boolean
  total_amount: number
  source: ReservationSource
  status: ReservationStatus
  internal_note: string
  client_name: string
  client_email: string
  client_phone: string
  client_nationality: string
  passport_number: string
  deposit_amount: number
  deposit_date: string
  deposit_method: string
}

const today = format(new Date(), 'yyyy-MM-dd')
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

const EMPTY: FormData = {
  villa_id: '', check_in: today, check_out: tomorrow,
  check_in_time: '14:00', check_out_time: '11:00',
  extras: [], adults: 1, children: 0, guests: 1,
  occasion: '', has_pets: false,
  total_amount: 0, source: 'direct', status: 'confirmed',
  internal_note: '', client_name: '', client_email: '', client_phone: '',
  client_nationality: '', passport_number: '',
  deposit_amount: 0, deposit_date: '', deposit_method: 'espèces',
}

async function sendConfirmationEmail(params: {
  clientEmail: string; clientName: string; villaName: string
  checkIn: string; checkOut: string; checkInTime: string; checkOutTime: string
  totalAmount: number; agencyName: string; extras: Extra[]
}) {
  try {
    const res = await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error))
      toast.error('Email non envoyé : ' + (errMsg || 'erreur inconnue'), { duration: 6000 })
      console.error('send-confirmation error:', data)
    } else {
      toast.success('Email de confirmation envoyé !')
    }
  } catch (e) {
    console.error('send-confirmation fetch error:', e)
    toast.error('Email non envoyé : erreur réseau', { duration: 6000 })
  }
}

export default function ReservationForm({ open, reservation, defaultDate, onClose }: Props) {
  const { t } = useTranslation()
  const { add, update, checkConflict } = useReservationsStore()
  const { villas } = useVillasStore()
  const { computePrice, fetch: fetchPricing } = usePricingStore()
  const { tenant } = useAuthStore()
  const { extras: allExtras, fetch: fetchExtras } = useExtrasStore()
  const availableExtras = allExtras.filter(e => e.enabled !== false)
  const { fetch: fetchBlacklist, check: checkBlacklist } = useBlacklistStore()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(false)
  // true = auto-calc is active (new reservation or after user changes villa/dates)
  const autoCalc = useRef(true)

  useEffect(() => { fetchExtras(); fetchBlacklist(); fetchPricing() }, [])

  useEffect(() => {
    if (reservation) {
      autoCalc.current = false // editing: don't override existing total
      setForm({
        villa_id: reservation.villa_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        check_in_time: reservation.check_in_time ?? '14:00',
        check_out_time: reservation.check_out_time ?? '11:00',
        extras: reservation.extras ?? [],
        adults: reservation.adults ?? reservation.guests,
        children: reservation.children ?? 0,
        guests: reservation.guests,
        occasion: reservation.occasion ?? '',
        has_pets: reservation.has_pets ?? false,
        total_amount: reservation.total_amount,
        source: reservation.source,
        status: reservation.status,
        internal_note: reservation.internal_note ?? '',
        client_name: reservation.client?.full_name ?? '',
        client_email: reservation.client?.email ?? '',
        client_phone: reservation.client?.phone ?? '',
        client_nationality: reservation.client?.nationality ?? '',
        passport_number: reservation.client?.passport_number ?? '',
        deposit_amount: reservation.deposit_amount ?? 0,
        deposit_date: reservation.deposit_date ?? '',
        deposit_method: reservation.deposit_method ?? 'espèces',
      })
    } else {
      autoCalc.current = true // new reservation: auto-calc enabled
      setForm({
        ...EMPTY,
        check_in: defaultDate ?? today,
        check_out: defaultDate ? format(addDays(parseISO(defaultDate), 1), 'yyyy-MM-dd') : tomorrow,
      })
    }
    setConflict(false)
  }, [reservation, defaultDate, open])

  // Belt-and-suspenders: recalculate whenever villa or dates change
  useEffect(() => {
    if (!autoCalc.current || !form.villa_id || !form.check_in || !form.check_out) return
    const villa = villas.find(villa_ => villa_.id === form.villa_id)
    if (!villa) return
    const nights = nightCount(form.check_in, form.check_out)
    if (nights <= 0) return
    const pricePerNight = computePrice(villa.base_price, parseISO(form.check_in))
    const extrasTotal = form.extras.reduce((s, e) => s + e.price * (e.quantity ?? 1), 0)
    setForm(f => ({ ...f, total_amount: Math.max(0, nights * pricePerNight) + extrasTotal }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.villa_id, form.check_in, form.check_out, villas])

  function set<K extends keyof FormData>(k: K, val: FormData[K]) {
    if (k === 'villa_id' || k === 'check_in' || k === 'check_out') {
      autoCalc.current = true
    }
    setForm(f => {
      const next = { ...f, [k]: val }
      // Immediate inline calculation (useEffect also recalculates after render)
      if ((k === 'villa_id' || k === 'check_in' || k === 'check_out') && next.villa_id && next.check_in && next.check_out) {
        const villa = villas.find(villa_ => villa_.id === next.villa_id)
        if (villa) {
          const nights = nightCount(next.check_in, next.check_out)
          const pricePerNight = computePrice(villa.base_price, parseISO(next.check_in))
          const extrasTotal = next.extras.reduce((s, e) => s + e.price * (e.quantity ?? 1), 0)
          next.total_amount = Math.max(0, nights * pricePerNight) + extrasTotal
        }
      }
      return next
    })
    if (k === 'villa_id' || k === 'check_in' || k === 'check_out') setConflict(false)
  }

  function extraLineTotal(e: Extra) { return e.price * (e.quantity ?? 1) }

  function toggleExtra(extra: Extra) {
    setForm(f => {
      const isSelected = f.extras.some(e => e.id === extra.id)
      const newExtras = isSelected
        ? f.extras.filter(e => e.id !== extra.id)
        : [...f.extras, { ...extra, quantity: 1 }]
      const prevTotal = f.extras.reduce((s, e) => s + extraLineTotal(e), 0)
      const newTotal  = newExtras.reduce((s, e) => s + extraLineTotal(e), 0)
      return { ...f, extras: newExtras, total_amount: Math.max(0, f.total_amount - prevTotal) + newTotal }
    })
  }

  function setExtraQty(extraId: string, qty: number) {
    setForm(f => {
      const prevTotal = f.extras.reduce((s, e) => s + extraLineTotal(e), 0)
      const newExtras = f.extras.map(e =>
        e.id === extraId ? { ...e, quantity: Math.max(1, qty) } : e
      )
      const newTotal = newExtras.reduce((s, e) => s + extraLineTotal(e), 0)
      return { ...f, extras: newExtras, total_amount: Math.max(0, f.total_amount - prevTotal) + newTotal }
    })
  }

  function validateDates(overrides?: { villa_id?: string; check_in?: string; check_out?: string }) {
    const vid = overrides?.villa_id ?? form.villa_id
    const ci  = overrides?.check_in  ?? form.check_in
    const co  = overrides?.check_out ?? form.check_out
    if (!vid || !ci || !co) return
    setConflict(checkConflict(vid, ci, co, reservation?.id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflict) { toast.error(t('reservations.conflict')); return }
    if (form.check_in >= form.check_out) { toast.error('La date de départ doit être après l\'arrivée.'); return }
    setLoading(true)
    try {
      const villaName = villas.find(v => v.id === form.villa_id)?.name ?? ''
      const checkInFmt = format(parseISO(form.check_in), 'dd/MM/yyyy')
      const checkOutFmt = format(parseISO(form.check_out), 'dd/MM/yyyy')

      if (reservation) {
        const wasNotConfirmed = reservation.status !== 'confirmed'
        await update(reservation.id, {
          villa_id: form.villa_id, check_in: form.check_in, check_out: form.check_out,
          check_in_time: form.check_in_time, check_out_time: form.check_out_time,
          extras: form.extras, adults: form.adults, children: form.children,
          occasion: form.occasion || null, has_pets: form.has_pets,
          guests: form.guests, total_amount: form.total_amount, source: form.source,
          status: form.status, internal_note: form.internal_note || null,
          deposit_amount: form.deposit_amount,
          deposit_date: form.deposit_date || null,
          deposit_method: form.deposit_method || null,
        })
        toast.success('Réservation modifiée.')
        // Send email if status changed to confirmed
        if (form.status === 'confirmed' && wasNotConfirmed && reservation.client?.email) {
          sendConfirmationEmail({
            clientEmail: reservation.client.email,
            clientName: reservation.client.full_name,
            villaName, checkIn: checkInFmt, checkOut: checkOutFmt,
            checkInTime: form.check_in_time, checkOutTime: form.check_out_time,
            totalAmount: form.total_amount, agencyName: tenant?.name ?? 'VillaHub',
            extras: form.extras,
          })
        }
      } else {
        const result = await add({
          villa_id: form.villa_id, check_in: form.check_in, check_out: form.check_out,
          check_in_time: form.check_in_time, check_out_time: form.check_out_time,
          extras: form.extras, adults: form.adults, children: form.children,
          occasion: form.occasion || null, has_pets: form.has_pets,
          guests: form.guests, total_amount: form.total_amount, source: form.source,
          status: form.status, internal_note: form.internal_note || null,
          deposit_amount: form.deposit_amount,
          deposit_date: form.deposit_date || null,
          deposit_method: form.deposit_method || null,
          client_id: null, currency: 'TND', ical_uid: null,
          client: {
            full_name: form.client_name, email: form.client_email || null,
            phone: form.client_phone || null, nationality: form.client_nationality || null,
            passport_number: form.passport_number || null,
          },
        })
        toast.success('Réservation créée !')
        // Send email if confirmed and client has email
        if (form.status === 'confirmed' && form.client_email) {
          sendConfirmationEmail({
            clientEmail: form.client_email, clientName: form.client_name,
            villaName: result.villa?.name ?? villaName,
            checkIn: checkInFmt, checkOut: checkOutFmt,
            checkInTime: form.check_in_time, checkOutTime: form.check_out_time,
            totalAmount: form.total_amount, agencyName: tenant?.name ?? 'VillaHub',
            extras: form.extras,
          })
        }
      }
      onClose()
    } catch (err: unknown) {
      const msg = (err as any)?.message || String(err) || ''
      if (msg.includes('no_overlap') || msg.includes('exclusion')) {
        toast.error('Ces dates sont déjà réservées pour cette villa. Choisissez d\'autres dates.', { duration: 6000 })
        setConflict(true)
      } else {
        toast.error('Erreur : ' + (msg || 'inconnue'), { duration: 8000 })
      }
    } finally {
      setLoading(false)
    }
  }

  const villaOpts = villas.map(v => ({ value: v.id, label: v.name }))
  const sourceOpts = SOURCES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))
  const statusOpts = STATUSES.map(s => ({ value: s, label: t(`reservations.${s}`) }))
  const occasionOpts = [{ value: '', label: '— Choisir —' }, ...OCCASIONS.map(o => ({ value: o, label: o }))]
  const nights = form.check_in && form.check_out ? Math.max(0, nightCount(form.check_in, form.check_out)) : 0
  const extrasTotal = form.extras.reduce((s, e) => s + e.price * (e.quantity ?? 1), 0)
  const blacklistMatch = !reservation ? checkBlacklist(form.client_name, form.client_phone, form.client_email) : null
  const currency = tenant?.currency ?? 'TND'
  const selectedVilla = form.villa_id ? villas.find(v => v.id === form.villa_id) : null
  const pricePerNight = selectedVilla && form.check_in
    ? computePrice(selectedVilla.base_price, parseISO(form.check_in))
    : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reservation ? t('reservations.edit') : t('reservations.add')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="res-form" type="submit" loading={loading}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="res-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Villa + dates */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Séjour</h3>
          <div className="space-y-3">
            <Select
              label={t('reservations.villa')}
              options={villaOpts}
              value={form.villa_id}
              onChange={e => { set('villa_id', e.target.value); validateDates({ villa_id: e.target.value }) }}
              placeholder="— Choisir une villa —"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('reservations.check_in')} type="date" value={form.check_in} onChange={e => { set('check_in', e.target.value); validateDates({ check_in: e.target.value }) }} required />
              <Input label={t('reservations.check_out')} type="date" value={form.check_out} onChange={e => { set('check_out', e.target.value); validateDates({ check_out: e.target.value }) }} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Heure d'arrivée" type="time" value={form.check_in_time} onChange={e => set('check_in_time', e.target.value)} />
              <Input label="Heure de départ" type="time" value={form.check_out_time} onChange={e => set('check_out_time', e.target.value)} />
            </div>
            {conflict && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠️ {t('reservations.conflict')}</p>}
            <div className="grid grid-cols-3 gap-3">
              <Input label="Adultes" type="number" min={0} value={form.adults} onChange={e => { const v = +e.target.value; setForm(f => ({ ...f, adults: v, guests: v + f.children })) }} />
              <Input label="Enfants" type="number" min={0} value={form.children} onChange={e => { const v = +e.target.value; setForm(f => ({ ...f, children: v, guests: f.adults + v })) }} />
              <Input label="Total voyageurs" type="number" min={1} value={form.guests} onChange={e => set('guests', +e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Occasion" options={occasionOpts} value={form.occasion} onChange={e => set('occasion', e.target.value)} />
              <label className="flex items-center gap-3 mt-6 cursor-pointer">
                <input type="checkbox" checked={form.has_pets} onChange={e => set('has_pets', e.target.checked)} className="accent-brand-800 w-4 h-4" />
                <span className="text-sm text-gray-700">🐾 Animaux de compagnie</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reservations.amount')}
                {nights > 0 && <span className="text-gray-400 font-normal ml-1">({nights} nuit{nights > 1 ? 's' : ''})</span>}
              </label>
              <input
                type="number" min={0} value={form.total_amount}
                onChange={e => { autoCalc.current = false; set('total_amount', +e.target.value) }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {selectedVilla && nights > 0 && pricePerNight > 0 && (
                <p className="text-xs text-teal-600 mt-1.5">
                  ✨ {pricePerNight} {currency}/nuit × {nights} nuit{nights > 1 ? 's' : ''}
                  {extrasTotal > 0 && ` + ${extrasTotal} ${currency} extras`}
                  {' = '}
                  <strong>{pricePerNight * nights + extrasTotal} {currency}</strong>
                  {' '}
                  <span className="text-gray-400">(modifiable pour remise)</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Client */}
        {!reservation && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Client</h3>
            {blacklistMatch && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">⛔ Client en liste noire</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {blacklistMatch.full_name && <span>{blacklistMatch.full_name} · </span>}
                    Motif : {blacklistMatch.reason || 'non précisé'}
                  </p>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={t('reservations.client_name')} value={form.client_name} onChange={e => set('client_name', e.target.value)} required />
              <Input label={t('reservations.client_phone')} value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
              <Input label={t('reservations.client_email')} type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} />
              <Input label={t('reservations.client_nationality')} value={form.client_nationality} onChange={e => set('client_nationality', e.target.value)} />
              <Input label="N° Passeport / CIN" value={form.passport_number} onChange={e => set('passport_number', e.target.value)} placeholder="Ex : AB123456" className="sm:col-span-2" />
            </div>
          </div>
        )}

        {/* Extras */}
        {availableExtras.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Extras & Services</h3>
            <div className="space-y-2">
              {availableExtras.map(extra => {
                const selected = form.extras.find(e => e.id === extra.id)
                const checked  = !!selected
                const qty      = selected?.quantity ?? 1
                const subtotal = extra.price * qty
                const maxQty   = Math.max(1, nights)
                return (
                  <div
                    key={extra.id}
                    className={`p-3 rounded-lg border transition-colors ${checked ? 'border-brand-400 bg-brand-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtra(extra)}
                        className="accent-brand-800 w-4 h-4 flex-shrink-0 cursor-pointer"
                      />
                      {/* Icon + name */}
                      {extra.icon && <span className="text-lg flex-shrink-0">{extra.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 font-medium leading-tight">{extra.name}</p>
                        {extra.description && <p className="text-xs text-gray-400 truncate">{extra.description}</p>}
                      </div>
                      {/* Right side */}
                      {checked ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => setExtraQty(extra.id, qty - 1)}
                              disabled={qty <= 1}
                              className="px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold"
                            >−</button>
                            <input
                              type="number"
                              min={1}
                              max={maxQty}
                              value={qty}
                              onChange={e => setExtraQty(extra.id, +e.target.value)}
                              className="w-10 text-center text-sm py-1 border-none outline-none bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setExtraQty(extra.id, qty + 1)}
                              disabled={qty >= maxQty}
                              className="px-2 py-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold"
                            >+</button>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">× {extra.price}</span>
                          <span className="text-sm font-bold text-brand-800 whitespace-nowrap min-w-[60px] text-right">
                            {subtotal} TND
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 flex-shrink-0">{extra.price} TND</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {extrasTotal > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                <span>Total extras</span>
                <span className="font-semibold text-gray-800">+{extrasTotal} TND</span>
              </div>
            )}
          </div>
        )}

        {/* Paiement */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Paiement</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acompte versé (TND)</label>
              <input
                type="number" min={0} max={form.total_amount}
                value={form.deposit_amount}
                onChange={e => set('deposit_amount', Math.min(+e.target.value, form.total_amount))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <Input
              label="Date du versement"
              type="date"
              value={form.deposit_date}
              onChange={e => set('deposit_date', e.target.value)}
            />
          </div>
          <Select
            label="Mode de paiement"
            options={DEPOSIT_METHODS}
            value={form.deposit_method}
            onChange={e => set('deposit_method', e.target.value)}
          />
          {/* Récap paiement */}
          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total séjour</span>
              <span className="font-medium text-gray-800">{form.total_amount} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Acompte versé</span>
              <span className="font-medium text-green-600">− {form.deposit_amount} TND</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
              <span>Reste à payer</span>
              <span className={form.total_amount - form.deposit_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                {Math.max(0, form.total_amount - form.deposit_amount)} TND
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-gray-400">Statut paiement</span>
              {(() => {
                const ps = getPaymentStatus(form.deposit_amount, form.total_amount)
                const { label, cls } = PAYMENT_STATUS_STYLES[ps]
                return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
              })()}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Détails</h3>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('reservations.source')} options={sourceOpts} value={form.source} onChange={e => set('source', e.target.value as ReservationSource)} />
            <Select label={t('reservations.status')} options={statusOpts} value={form.status} onChange={e => set('status', e.target.value as ReservationStatus)} />
          </div>
          <div className="mt-3">
            <Textarea label={t('reservations.note')} value={form.internal_note} onChange={e => set('internal_note', e.target.value)} rows={2} />
          </div>
        </div>
      </form>
    </Modal>
  )
}
