import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addMonths, subMonths, format, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, parseISO, areIntervalsOverlapping,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import ReservationForm from '@/components/reservations/ReservationForm'
import { useVillasStore } from '@/stores/villas.store'
import { useReservationsStore } from '@/stores/reservations.store'
import { SOURCE_HEX } from '@/lib/utils'
import type { Reservation } from '@/types'
import { cn } from '@/lib/utils'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getMonthDays(month: Date) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  // Pad start to Monday
  const pad = (start.getDay() + 6) % 7
  const prefix: null[] = Array(pad).fill(null)
  return [...prefix, ...days]
}

export default function CalendarPage() {
  const { t } = useTranslation()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const { reservations, fetch: fetchRes } = useReservationsStore()
  const [month, setMonth] = useState(new Date())
  const [villaFilter, setVillaFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => { fetchVillas(); fetchRes() }, [])

  const days = getMonthDays(month)

  function getReservationsForDay(day: Date): Reservation[] {
    return reservations.filter(r =>
      r.status !== 'cancelled' &&
      (villaFilter === 'all' || r.villa_id === villaFilter) &&
      areIntervalsOverlapping(
        { start: day, end: day },
        { start: parseISO(r.check_in), end: parseISO(r.check_out) },
        { inclusive: true }
      )
    )
  }

  function handleDayClick(day: Date) {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
    setFormOpen(true)
  }

  const villaOptions = [
    { value: 'all', label: t('calendar.all_villas') },
    ...villas.map(v => ({ value: v.id, label: v.name })),
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
        <div className="flex items-center gap-3">
          <Select options={villaOptions} value={villaFilter} onChange={e => setVillaFilter(e.target.value)} className="w-44" />
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
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50" />
            const dayRes = getReservationsForDay(day)
            const inMonth = isSameMonth(day, month)
            const today = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'min-h-[90px] border-b border-r border-gray-100 p-1.5 text-left align-top',
                  'hover:bg-brand-50 transition-colors',
                  !inMonth && 'bg-gray-50/50',
                  today && 'bg-brand-50'
                )}
              >
                <span className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1',
                  today ? 'bg-brand-800 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                )}>
                  {format(day, 'd')}
                </span>
                <div className="space-y-0.5">
                  {dayRes.slice(0, 3).map(r => (
                    <div
                      key={r.id}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium"
                      style={{ backgroundColor: SOURCE_HEX[r.source] ?? '#9CA3AF' }}
                      title={`${r.client?.full_name ?? '?'} · ${r.villa?.name ?? '?'}`}
                    >
                      {r.villa?.name?.replace('Villa ', '') ?? '?'}
                    </div>
                  ))}
                  {dayRes.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayRes.length - 3}</div>
                  )}
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
      </div>

      <ReservationForm
        open={formOpen}
        defaultDate={selectedDate}
        onClose={() => { setFormOpen(false); setSelectedDate(null) }}
      />
    </div>
  )
}
