import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addMonths, subMonths, format, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, parseISO, areIntervalsOverlapping,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Lock, Wrench, Home, Ban } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ReservationForm from '@/components/reservations/ReservationForm'
import { useVillasStore } from '@/stores/villas.store'
import { useReservationsStore } from '@/stores/reservations.store'
import { useBlockedPeriodsStore } from '@/stores/blocked_periods.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { SOURCE_HEX } from '@/lib/utils'
import type { Reservation, BlockedPeriod, BlockedReason } from '@/types'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const REASON_LABELS: Record<BlockedReason, { label: string; icon: React.ReactNode; color: string }> = {
  entretien:       { label: 'Entretien / maintenance', icon: <Wrench className="h-3 w-3" />,  color: '#F59E0B' },
  usage_personnel: { label: 'Usage personnel',          icon: <Home className="h-3 w-3" />,    color: '#8B5CF6' },
  autre:           { label: 'Autre',                    icon: <Ban className="h-3 w-3" />,     color: '#6B7280' },
}

function getMonthDays(month: Date) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const pad = (start.getDay() + 6) % 7
  const prefix: null[] = Array(pad).fill(null)
  return [...prefix, ...days]
}

/* ─── Block modal ────────────────────────────────────────────────────────── */
function BlockModal({
  open, defaultDate, villas, onClose,
}: {
  open: boolean
  defaultDate: string | null
  villas: { id: string; name: string }[]
  onClose: () => void
}) {
  const { add } = useBlockedPeriodsStore()
  const [form, setForm] = useState({
    villa_id: '' as string,
    start_date: defaultDate ?? '',
    end_date: defaultDate ?? '',
    start_time: '',
    end_time: '',
    reason: 'entretien' as BlockedReason,
    note: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm(f => ({ ...f, start_date: defaultDate ?? '', end_date: defaultDate ?? '' }))
  }, [open, defaultDate])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.start_date || !form.end_date) { toast.error('Dates requises.'); return }
    if (form.end_date < form.start_date) { toast.error('La date de fin doit être après la date de début.'); return }
    setLoading(true)
    try {
      await add({
        villa_id: form.villa_id || null,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        reason: form.reason,
        note: form.note.trim() || undefined,
      })
      toast.success('Période bloquée.')
      onClose()
    } catch { toast.error('Erreur lors du blocage.') }
    finally { setLoading(false) }
  }

  const villaOpts = [
    { value: '', label: 'Toutes les villas' },
    ...villas.map(v => ({ value: v.id, label: v.name })),
  ]
  const reasonOpts = Object.entries(REASON_LABELS).map(([k, v]) => ({ value: k, label: v.label }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bloquer des dates"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button form="block-form" type="submit" loading={loading}>Bloquer</Button>
        </>
      }
    >
      <form id="block-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Villa concernée"
          options={villaOpts}
          value={form.villa_id}
          onChange={e => set('villa_id', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Du" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
          <Input label="Au" type="date" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} required />
        </div>
        {/* Heures optionnelles */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Heures <span className="text-gray-400">(optionnel — vide = journée entière)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Heure de début" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            <Input label="Heure de fin" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
        </div>
        <Select
          label="Motif"
          options={reasonOpts}
          value={form.reason}
          onChange={e => set('reason', e.target.value as BlockedReason)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Note <span className="font-normal text-gray-400">(optionnel)</span></label>
          <input
            value={form.note}
            onChange={e => set('note', e.target.value)}
            placeholder="Ex : plombier prévu, vacances famille…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      </form>
    </Modal>
  )
}

/* ─── Blocked period detail modal ────────────────────────────────────────── */
function BlockDetailModal({
  period, villas, onClose, onDelete,
}: {
  period: BlockedPeriod | null
  villas: { id: string; name: string }[]
  onClose: () => void
  onDelete: () => void
}) {
  if (!period) return null
  const info = REASON_LABELS[period.reason]
  const villa = villas.find(v => v.id === period.villa_id)
  return (
    <Modal
      open={!!period}
      onClose={onClose}
      title="Période bloquée"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="danger" onClick={onDelete}>Supprimer le blocage</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span style={{ color: info.color }}>{info.icon}</span>
          <span className="font-medium">{info.label}</span>
        </div>
        <p><span className="text-gray-500">Villa :</span> {villa?.name ?? 'Toutes les villas'}</p>
        <p>
          <span className="text-gray-500">Période :</span>{' '}
          {format(parseISO(period.start_date), 'dd MMM yyyy', { locale: fr })}
          {period.start_time && ` à ${period.start_time}`}
          {' → '}
          {format(parseISO(period.end_date), 'dd MMM yyyy', { locale: fr })}
          {period.end_time && ` à ${period.end_time}`}
        </p>
        {period.note && <p><span className="text-gray-500">Note :</span> {period.note}</p>}
      </div>
    </Modal>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function CalendarPage() {
  const { t } = useTranslation()
  const { plural } = usePropertyTerm()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const { reservations, fetch: fetchRes } = useReservationsStore()
  const { periods, fetch: fetchPeriods, remove } = useBlockedPeriodsStore()
  const [month, setMonth] = useState(new Date())
  const [villaFilter, setVillaFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailPeriod, setDetailPeriod] = useState<BlockedPeriod | null>(null)

  useEffect(() => { fetchVillas(); fetchRes(); fetchPeriods() }, [])

  const days = getMonthDays(month)

  function getReservationsForDay(day: Date): Reservation[] {
    return reservations.filter(r =>
      r.status === 'confirmed' &&
      !r.archived_at &&
      (villaFilter === 'all' || r.villa_id === villaFilter) &&
      areIntervalsOverlapping(
        { start: day, end: day },
        { start: parseISO(r.check_in), end: parseISO(r.check_out) },
        { inclusive: true }
      )
    )
  }

  function getBlockedForDay(day: Date): BlockedPeriod[] {
    return periods.filter(p =>
      (villaFilter === 'all' || p.villa_id === null || p.villa_id === villaFilter) &&
      areIntervalsOverlapping(
        { start: day, end: day },
        { start: parseISO(p.start_date), end: parseISO(p.end_date) },
        { inclusive: true }
      )
    )
  }

  function handleDayClick(day: Date) {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
    setFormOpen(true)
  }

  async function handleDeletePeriod() {
    if (!detailPeriod) return
    await remove(detailPeriod.id)
    toast.success('Blocage supprimé.')
    setDetailPeriod(null)
  }

  const villaOptions = [
    { value: 'all', label: `Toutes les ${plural.toLowerCase()}` },
    ...villas.map(v => ({ value: v.id, label: v.name })),
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Select options={villaOptions} value={villaFilter} onChange={e => setVillaFilter(e.target.value)} className="w-44" />
          <Button
            variant="outline"
            icon={<Lock className="h-4 w-4" />}
            onClick={() => { setSelectedDate(null); setBlockOpen(true) }}
          >
            Bloquer des dates
          </Button>
          <Button icon={<CalendarDays className="h-4 w-4" />} onClick={() => { setSelectedDate(null); setFormOpen(true) }}>
            Nouvelle réservation
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900 capitalize min-w-[180px] text-center">
          {format(month, 'MMMM yyyy', { locale: fr })}
        </h2>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
        <button onClick={() => setMonth(new Date())} className="text-sm text-brand-700 hover:underline ml-2">
          {t('calendar.today')}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS_FR.map(d => (
            <div key={d} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="min-h-[48px] sm:min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50" />
            const dayRes = getReservationsForDay(day)
            const dayBlocked = getBlockedForDay(day)
            const inMonth = isSameMonth(day, month)
            const todayCell = isToday(day)
            const isBlockedDay = dayBlocked.length > 0

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  if (isBlockedDay) {
                    setDetailPeriod(dayBlocked[0])
                  } else {
                    handleDayClick(day)
                  }
                }}
                className={cn(
                  'min-h-[48px] sm:min-h-[90px] border-b border-r border-gray-100 p-1 sm:p-1.5 text-left align-top relative',
                  'hover:brightness-95 transition-all',
                  !inMonth && 'bg-gray-50/50',
                  todayCell && !isBlockedDay && 'bg-brand-50',
                  isBlockedDay && 'bg-orange-50'
                )}
                style={isBlockedDay ? {
                  backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(245,158,11,0.08) 5px, rgba(245,158,11,0.08) 10px)',
                } : undefined}
              >
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1',
                  todayCell ? 'bg-brand-800 text-white'
                    : inMonth ? 'text-gray-700'
                    : 'text-gray-300'
                )}>
                  {format(day, 'd')}
                </span>

                <div className="space-y-0.5 hidden sm:block">
                  {/* Blocked badges */}
                  {dayBlocked.slice(0, 1).map(p => {
                    const info = REASON_LABELS[p.reason]
                    const timeLabel = p.start_time && p.end_time
                      ? ` ${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}`
                      : p.start_time ? ` dès ${p.start_time.slice(0, 5)}` : ''
                    return (
                      <div
                        key={p.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium flex items-center gap-1"
                        style={{ backgroundColor: info.color }}
                        title={info.label + timeLabel + (p.note ? ` — ${p.note}` : '')}
                      >
                        {info.icon}
                        <span className="truncate">{info.label}{timeLabel}</span>
                      </div>
                    )
                  })}
                  {/* Reservation badges */}
                  {dayRes.slice(0, 2).map(r => (
                    <div
                      key={r.id}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium"
                      style={{ backgroundColor: SOURCE_HEX[r.source] ?? '#9CA3AF' }}
                      title={`${r.client?.full_name ?? '?'} · ${r.villa?.name ?? '?'}`}
                    >
                      {r.villa?.name?.replace('Villa ', '') ?? '?'}
                    </div>
                  ))}
                  {(dayBlocked.length + dayRes.length) > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayBlocked.length + dayRes.length - 3}</div>
                  )}
                </div>

                {/* Mobile indicators */}
                <div className="sm:hidden flex gap-0.5 flex-wrap mt-0.5">
                  {isBlockedDay && (
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: REASON_LABELS[dayBlocked[0].reason].color }} />
                  )}
                  {dayRes.slice(0, 2).map(r => (
                    <span key={r.id} className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: SOURCE_HEX[r.source] ?? '#9CA3AF' }} />
                  ))}
                  {dayRes.length > 2 && <span className="text-[8px] text-gray-400">+{dayRes.length - 2}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {Object.entries(SOURCE_HEX).map(([source, color]) => (
          <span key={source} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {source}
          </span>
        ))}
        {Object.entries(REASON_LABELS).map(([key, { label, color }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block opacity-80" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Modals */}
      <ReservationForm
        open={formOpen}
        defaultDate={selectedDate}
        onClose={() => { setFormOpen(false); setSelectedDate(null) }}
      />
      <BlockModal
        open={blockOpen}
        defaultDate={selectedDate}
        villas={villas}
        onClose={() => { setBlockOpen(false); setSelectedDate(null) }}
      />
      <BlockDetailModal
        period={detailPeriod}
        villas={villas}
        onClose={() => setDetailPeriod(null)}
        onDelete={handleDeletePeriod}
      />
    </div>
  )
}
