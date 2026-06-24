import { useEffect, useState } from 'react'
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
import { nightCount } from '@/lib/utils'
import type { ReservationSource, ReservationStatus, Reservation } from '@/types'
import { parseISO, addDays, format } from 'date-fns'

const SOURCES: ReservationSource[] = ['airbnb', 'booking', 'direct', 'whatsapp', 'vrbo', 'autre']
const STATUSES: ReservationStatus[] = ['confirmed', 'pending', 'cancelled', 'checkout']

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
  guests: number
  total_amount: number
  source: ReservationSource
  status: ReservationStatus
  internal_note: string
  client_name: string
  client_email: string
  client_phone: string
  client_nationality: string
}

const today = format(new Date(), 'yyyy-MM-dd')
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

const EMPTY: FormData = {
  villa_id: '', check_in: today, check_out: tomorrow,
  check_in_time: '14:00', check_out_time: '11:00',
  guests: 2, total_amount: 0, source: 'direct', status: 'confirmed',
  internal_note: '', client_name: '', client_email: '', client_phone: '', client_nationality: '',
}

async function sendConfirmationEmail(params: {
  clientEmail: string; clientName: string; villaName: string
  checkIn: string; checkOut: string; checkInTime: string; checkOutTime: string
  totalAmount: number; agencyName: string
}) {
  try {
    await fetch('/.netlify/functions/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // email failure is non-critical
  }
}

export default function ReservationForm({ open, reservation, defaultDate, onClose }: Props) {
  const { t } = useTranslation()
  const { add, update, checkConflict } = useReservationsStore()
  const { villas } = useVillasStore()
  const { computePrice } = usePricingStore()
  const { tenant } = useAuthStore()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    if (reservation) {
      setForm({
        villa_id: reservation.villa_id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        check_in_time: reservation.check_in_time ?? '14:00',
        check_out_time: reservation.check_out_time ?? '11:00',
        guests: reservation.guests,
        total_amount: reservation.total_amount,
        source: reservation.source,
        status: reservation.status,
        internal_note: reservation.internal_note ?? '',
        client_name: reservation.client?.full_name ?? '',
        client_email: reservation.client?.email ?? '',
        client_phone: reservation.client?.phone ?? '',
        client_nationality: reservation.client?.nationality ?? '',
      })
    } else {
      setForm({
        ...EMPTY,
        check_in: defaultDate ?? today,
        check_out: defaultDate ? format(addDays(parseISO(defaultDate), 1), 'yyyy-MM-dd') : tomorrow,
      })
    }
    setConflict(false)
  }, [reservation, defaultDate, open])

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if ((k === 'villa_id' || k === 'check_in' || k === 'check_out') && next.villa_id && next.check_in && next.check_out) {
        const villa = villas.find(v => v.id === next.villa_id)
        if (villa) {
          const nights = nightCount(next.check_in, next.check_out)
          const pricePerNight = computePrice(villa.base_price, parseISO(next.check_in))
          next.total_amount = Math.max(0, nights * pricePerNight)
        }
      }
      return next
    })
    if (k === 'villa_id' || k === 'check_in' || k === 'check_out') setConflict(false)
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
          guests: form.guests, total_amount: form.total_amount, source: form.source,
          status: form.status, internal_note: form.internal_note || null,
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
          })
        }
      } else {
        const result = await add({
          villa_id: form.villa_id, check_in: form.check_in, check_out: form.check_out,
          check_in_time: form.check_in_time, check_out_time: form.check_out_time,
          guests: form.guests, total_amount: form.total_amount, source: form.source,
          status: form.status, internal_note: form.internal_note || null,
          client_id: null, currency: 'TND', ical_uid: null,
          client: { full_name: form.client_name, email: form.client_email || null, phone: form.client_phone || null, nationality: form.client_nationality || null },
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
  const nights = form.check_in && form.check_out ? Math.max(0, nightCount(form.check_in, form.check_out)) : 0

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
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('reservations.guests')} type="number" min={1} value={form.guests} onChange={e => set('guests', +e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.amount')} ({nights} nuits)</label>
                <input type="number" min={0} value={form.total_amount} onChange={e => set('total_amount', +e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Client */}
        {!reservation && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Client</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={t('reservations.client_name')} value={form.client_name} onChange={e => set('client_name', e.target.value)} required />
              <Input label={t('reservations.client_phone')} value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
              <Input label={t('reservations.client_email')} type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} />
              <Input label={t('reservations.client_nationality')} value={form.client_nationality} onChange={e => set('client_nationality', e.target.value)} />
            </div>
          </div>
        )}

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
