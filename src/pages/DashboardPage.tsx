import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Home, CalendarCheck,
  CalendarX, Clock, Moon, Coins, BarChart3, ArrowRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, startOfMonth, endOfMonth, isToday, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useVillasStore } from '@/stores/villas.store'
import { useReservationsStore } from '@/stores/reservations.store'
import { SOURCE_COLORS, SOURCE_HEX } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import type { ReservationSource } from '@/types'

function KpiCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType; trend?: number
}) {
  return (
    <Card className="flex items-start gap-4">
      <div className="p-2.5 bg-brand-50 rounded-xl flex-shrink-0">
        <Icon className="h-5 w-5 text-brand-800" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        {sub && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            {trend !== undefined && (
              trend >= 0
                ? <TrendingUp className="h-3 w-3 text-success-600" />
                : <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            {sub}
          </p>
        )}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const { reservations, fetch: fetchRes } = useReservationsStore()
  const { fmt } = useCurrency()

  useEffect(() => { fetchVillas(); fetchRes() }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const currentStart = startOfMonth(now)
    const currentEnd = endOfMonth(now)
    const prevStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const prevEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    const activeVillas = villas.filter(v => v.status === 'active')
    const confirmed = reservations.filter(r => r.status !== 'cancelled')

    function monthRevenue(start: Date, end: Date) {
      return confirmed
        .filter(r => {
          const ci = parseISO(r.check_in)
          return ci >= start && ci <= end
        })
        .reduce((s, r) => s + r.total_amount, 0)
    }

    const revCurrent = monthRevenue(currentStart, currentEnd)
    const revPrev = monthRevenue(prevStart, prevEnd)
    const revTrend = revPrev > 0 ? ((revCurrent - revPrev) / revPrev) * 100 : 0

    const today = now
    const checkinsToday = confirmed.filter(r => isToday(parseISO(r.check_in))).length
    const checkoutsToday = confirmed.filter(r => isToday(parseISO(r.check_out))).length
    const pending = reservations.filter(r => r.status === 'pending').length

    // 30d occupancy
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const nights30 = confirmed
      .filter(r => parseISO(r.check_out) >= thirtyDaysAgo && parseISO(r.check_in) <= now)
      .reduce((s, r) => {
        const ci = parseISO(r.check_in)
        const co = parseISO(r.check_out)
        const start = ci < thirtyDaysAgo ? thirtyDaysAgo : ci
        const end = co > now ? now : co
        return s + Math.max(0, differenceInDays(end, start))
      }, 0)
    const totalAvailableNights = activeVillas.length * 30
    const occupancy = totalAvailableNights > 0 ? (nights30 / totalAvailableNights) * 100 : 0

    const avgPrice = nights30 > 0
      ? confirmed.filter(r => parseISO(r.check_out) >= thirtyDaysAgo).reduce((s, r) => s + r.total_amount, 0) / nights30
      : 0
    const revpar = activeVillas.length > 0 ? avgPrice * (occupancy / 100) : 0

    // By source
    const sourceMap: Record<string, { count: number; amount: number }> = {}
    confirmed.forEach(r => {
      if (!sourceMap[r.source]) sourceMap[r.source] = { count: 0, amount: 0 }
      sourceMap[r.source].count++
      sourceMap[r.source].amount += r.total_amount
    })
    const bySource = Object.entries(sourceMap).map(([source, v]) => ({ source: source as ReservationSource, ...v }))

    // By villa
    const villaMap: Record<string, { name: string; revenue: number; nights: number }> = {}
    confirmed.forEach(r => {
      if (!villaMap[r.villa_id]) villaMap[r.villa_id] = { name: r.villa?.name ?? r.villa_id, revenue: 0, nights: 0 }
      villaMap[r.villa_id].revenue += r.total_amount
      villaMap[r.villa_id].nights += differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
    })
    const byVilla = Object.entries(villaMap)
      .map(([id, v]) => ({ villa_id: id, villa_name: v.name, revenue: v.revenue, nights: v.nights }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)

    // Upcoming arrivals (next 7 days)
    const upcoming = reservations
      .filter(r => r.status === 'confirmed' && parseISO(r.check_in) >= today && parseISO(r.check_in) <= new Date(today.getTime() + 7 * 86400000))
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .slice(0, 5)

    return { revCurrent, revPrev, revTrend, checkinsToday, checkoutsToday, pending, nights30, occupancy, avgPrice, revpar, bySource, byVilla, upcoming }
  }, [villas, reservations])

  const kpis = [
    { label: t('dashboard.revenue_month'),  value: fmt(stats.revCurrent), sub: `${stats.revTrend >= 0 ? '+' : ''}${stats.revTrend.toFixed(1)}% ${t('dashboard.revenue_vs_prev')}`, icon: Coins,        trend: stats.revTrend },
    { label: t('dashboard.occupancy'),       value: `${stats.occupancy.toFixed(0)}%`,                                                                       sub: `30 derniers jours`,                            icon: BarChart3,     trend: undefined },
    { label: t('dashboard.checkins_today'),  value: String(stats.checkinsToday),                                                                             sub: undefined,                                      icon: CalendarCheck, trend: undefined },
    { label: t('dashboard.checkouts_today'), value: String(stats.checkoutsToday),                                                                            sub: undefined,                                      icon: CalendarX,     trend: undefined },
    { label: t('dashboard.pending'),         value: String(stats.pending),                                                                                   sub: 'à confirmer',                                  icon: Clock,         trend: undefined },
    { label: t('dashboard.nights_sold'),     value: String(stats.nights30),                                                                                  sub: undefined,                                      icon: Moon,          trend: undefined },
    { label: t('dashboard.avg_price'),       value: fmt(stats.avgPrice),                                                                             sub: 'sur 30 jours',                                 icon: TrendingUp,    trend: undefined },
    { label: t('dashboard.revpar'),          value: fmt(stats.revpar),                                                                               sub: 'RevPAR 30j',                                   icon: Home,          trend: undefined },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By source pie */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4">{t('dashboard.by_source')}</h2>
          {stats.bySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.bySource} dataKey="amount" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}>
                  {stats.bySource.map(entry => (
                    <Cell key={entry.source} fill={SOURCE_HEX[entry.source] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">{t('dashboard.no_data')}</p>}
        </Card>

        {/* By villa bar */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4">{t('dashboard.by_villa')}</h2>
          {stats.byVilla.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byVilla} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="villa_name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#6B7C45" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">{t('dashboard.no_data')}</p>}
        </Card>
      </div>

      {/* Upcoming arrivals */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">{t('dashboard.upcoming')}</h2>
          <Link to="/reservations" className="text-sm text-brand-700 flex items-center gap-1 hover:underline">
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {stats.upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{t('dashboard.no_data')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.upcoming.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{r.client?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{r.villa?.name} · {r.guests} pers.</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{format(parseISO(r.check_in), 'dd/MM')}</p>
                  <Badge className={SOURCE_COLORS[r.source]}>{r.source}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
