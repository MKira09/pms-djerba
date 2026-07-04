import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Pencil, Archive, Mail, CheckCircle2, XCircle, RotateCcw, Download, FileText, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ReservationForm from '@/components/reservations/ReservationForm'
import DocumentsModal from '@/components/reservations/DocumentsModal'
import PaymentModal from '@/components/reservations/PaymentModal'
import { supabase } from '@/lib/supabase'
import { useReservationsStore } from '@/stores/reservations.store'
import { useVillasStore } from '@/stores/villas.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { SOURCE_COLORS, STATUS_COLORS } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import type { Reservation, ReservationStatus, ReservationSource } from '@/types'

type PaymentStatus = 'unpaid' | 'partial' | 'link_sent' | 'paid'
function getPaymentStatus(r: Reservation): PaymentStatus {
  if (r.payment_status === 'paid') return 'paid'
  if (r.payment_status === 'link_sent') return 'link_sent'
  const deposit = r.deposit_amount ?? 0
  if (deposit > 0 && deposit >= r.total_amount) return 'paid'
  if (deposit > 0) return 'partial'
  return 'unpaid'
}
const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid:    { label: 'Non payé',    cls: 'bg-red-100 text-red-700' },
  partial:   { label: 'Acompte',     cls: 'bg-orange-100 text-orange-700' },
  link_sent: { label: 'Lien envoyé', cls: 'bg-orange-100 text-orange-700' },
  paid:      { label: 'Payé',        cls: 'bg-green-100 text-green-700' },
}

export default function ReservationsPage() {
  const { t } = useTranslation()
  const { singular } = usePropertyTerm()
  const { reservations, archived, fetch, fetchArchived, remove, restore } = useReservationsStore()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const { fmt } = useCurrency()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [villaFilter, setVillaFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editRes, setEditRes] = useState<Reservation | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [docsRes, setDocsRes] = useState<Reservation | null>(null)
  const [paymentRes, setPaymentRes] = useState<Reservation | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [exportPeriod, setExportPeriod] = useState<'all' | 'month' | 'last_month' | 'quarter' | 'year'>('all')

  useEffect(() => { fetch(); fetchVillas() }, [])
  useEffect(() => {
    if (tab === 'archived') {
      fetchArchived().catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error(`Impossible de charger les archives : ${msg}`, { duration: 8000 })
        console.error('[fetchArchived]', e)
      })
    }
  }, [tab])

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.client?.full_name?.toLowerCase().includes(q) || r.villa?.name?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchVilla = villaFilter === 'all' || r.villa_id === villaFilter
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter
    return matchSearch && matchStatus && matchVilla && matchSource
  }).sort((a, b) => b.check_in.localeCompare(a.check_in))

  async function handleSendWelcomeEmail(reservationId: string) {
    const tid = toast.loading('Envoi de l\'email…')
    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', { body: { reservation_id: reservationId } })
      if (error) throw error
      toast.success('Email de bienvenue envoyé !', { id: tid })
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : 'inconnue'), { id: tid })
    }
  }

  async function handleConfirm(id: string) {
    const { error } = await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id)
    if (error) { toast.error('Erreur lors de la confirmation.'); return }
    fetch()
    toast.success('Réservation confirmée ✅')
    supabase.functions.invoke('send-booking-confirmed', { body: { reservation_id: id } }).catch(() => {})
  }

  async function handleRefuse(id: string) {
    const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)
    if (error) { toast.error('Erreur lors du refus.'); return }
    fetch()
    toast.success('Réservation refusée.')
    supabase.functions.invoke('send-booking-refused', { body: { reservation_id: id } }).catch(() => {})
  }

  async function handleArchive() {
    if (!archiveId) return
    try {
      await remove(archiveId)
      toast.success('Réservation archivée.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'inconnue'
      toast.error(`Erreur lors de l'archivage : ${msg}`, { duration: 8000 })
      console.error('[archive]', e)
    } finally {
      setArchiveId(null)
    }
  }

  async function handleRestore(id: string) {
    try {
      await restore(id)
      toast.success('Réservation restaurée.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'inconnue'
      toast.error(`Erreur lors de la restauration : ${msg}`, { duration: 8000 })
    }
  }

  function handleExport() {
    const now = new Date()
    const intervals: Record<typeof exportPeriod, { start: Date; end: Date } | null> = {
      all: null,
      month: { start: startOfMonth(now), end: endOfMonth(now) },
      last_month: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
      quarter: { start: startOfQuarter(now), end: endOfQuarter(now) },
      year: { start: startOfYear(now), end: endOfYear(now) },
    }
    const interval = intervals[exportPeriod]
    const source = interval
      ? reservations.filter(r => isWithinInterval(parseISO(r.check_in), interval))
      : reservations

    const STATUS_LABELS: Record<string, string> = {
      confirmed: 'Confirmée', pending: 'En attente', cancelled: 'Annulée', checkout: 'Check-out',
    }
    const rows = source.map(r => {
      const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
      return {
        'Nom client': r.client?.full_name ?? '',
        'Email': r.client?.email ?? '',
        'Téléphone': r.client?.phone ?? '',
        'Villa': r.villa?.name ?? '',
        'Arrivée': format(parseISO(r.check_in), 'dd/MM/yyyy'),
        'Départ': format(parseISO(r.check_out), 'dd/MM/yyyy'),
        'Nuits': nights,
        'Montant total': r.total_amount,
        'Statut': STATUS_LABELS[r.status] ?? r.status,
        'Date de création': format(parseISO(r.created_at), 'dd/MM/yyyy'),
      }
    })

    const periodLabel: Record<typeof exportPeriod, string> = {
      all: 'toutes', month: 'mois', last_month: 'mois-precedent', quarter: 'trimestre', year: 'annee',
    }
    const filename = `reservations_${periodLabel[exportPeriod]}_${format(now, 'yyyy-MM-dd')}`

    if (exportFormat === 'csv') {
      const headers = Object.keys(rows[0] ?? {})
      const csv = [
        headers.join(';'),
        ...rows.map(r => headers.map(h => String((r as Record<string, string | number>)[h] ?? '')).join(';')),
      ].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${filename}.csv`
      a.click()
    } else {
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Réservations')
      ws['!cols'] = [20, 28, 18, 20, 14, 14, 8, 16, 14, 16].map(w => ({ wch: w }))
      XLSX.writeFile(wb, `${filename}.xlsx`)
    }
    setExportOpen(false)
    toast.success(`Export ${exportFormat.toUpperCase()} téléchargé (${rows.length} réservation${rows.length > 1 ? 's' : ''})`)
  }

  const statusOpts = [
    { value: 'all', label: 'Tous les statuts' },
    ...(['confirmed', 'pending', 'cancelled', 'checkout'] as ReservationStatus[]).map(s => ({ value: s, label: t(`reservations.${s}`) })),
  ]
  const villaOpts = [{ value: 'all', label: `Toutes les ${singular.toLowerCase()}s` }, ...villas.map(v => ({ value: v.id, label: v.name }))]
  const sourceOpts = [{ value: 'all', label: 'Toutes les sources' }, ...(['airbnb','booking','direct','whatsapp','vrbo','autre'] as ReservationSource[]).map(s => ({ value: s, label: s }))]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reservations.title')}</h1>
          <p className="text-sm text-gray-500">
            {tab === 'active' ? `${filtered.length} réservation(s)` : `${archived.length} archivée(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
            Exporter
          </Button>
          {tab === 'active' && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditRes(null); setFormOpen(true) }}>
              {t('reservations.add')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['active', 'archived'] as const).map(t_ => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t_
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t_ === 'active' ? 'Actives' : 'Archivées'}
            {t_ === 'archived' && archived.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{archived.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ARCHIVED TAB ── */}
      {tab === 'archived' && (
        <Card padding={false} className="overflow-x-auto">
          {archived.length === 0 ? (
            <div className="py-16 text-center text-gray-400">Aucune réservation archivée.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{singular}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Séjour</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Archivée le</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archived.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors opacity-75">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">{r.client?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{r.guests} pers.</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.villa?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(parseISO(r.check_in), 'dd MMM yyyy', { locale: fr })} →{' '}
                      {format(parseISO(r.check_out), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{fmt(r.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={STATUS_COLORS[r.status]} dot>{t(`reservations.${r.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {r.archived_at ? format(parseISO(r.archived_at), 'dd MMM yyyy HH:mm', { locale: fr }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRestore(r.id)}
                        title="Restaurer"
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── ACTIVE TAB ── */}
      {tab === 'active' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Rechercher client ou villa…" value={search} onChange={e => setSearch(e.target.value)} left={<Search className="h-4 w-4" />} className="w-60" />
            <Select options={statusOpts} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44" />
            <Select options={villaOpts} value={villaFilter} onChange={e => setVillaFilter(e.target.value)} className="w-44" />
            <Select options={sourceOpts} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="w-40" />
          </div>

          {/* Mobile cards */}
          {filtered.length === 0 ? (
            <div className="md:hidden py-12 text-center text-gray-400">{t('reservations.no_reservations')}</div>
          ) : (
            <div className="md:hidden space-y-3">
              {filtered.map(r => {
                const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
                const ps = getPaymentStatus(r)
                const pb = PAYMENT_BADGE[ps]
                return (
                  <Card key={r.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{r.client?.full_name ?? '—'}</p>
                        <p className="text-sm text-gray-500 truncate">{r.villa?.name ?? '—'}</p>
                      </div>
                      <Badge className={STATUS_COLORS[r.status]} dot>{t(`reservations.${r.status}`)}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>📅 {format(parseISO(r.check_in), 'dd/MM')} → {format(parseISO(r.check_out), 'dd/MM')}</span>
                      <span className="text-gray-400">· {nights} nuit{nights > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={SOURCE_COLORS[r.source]}>{r.source}</Badge>
                        <span className="text-sm font-bold text-brand-800">{fmt(r.total_amount)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pb.cls}`}>{pb.label}</span>
                        {(() => {
                          const cashPaid  = r.deposit_amount ?? 0
                          const stripeAmt = r.stripe_amount != null ? Number(r.stripe_amount) : 0
                          const stripePaid = r.payment_status === 'paid' ? stripeAmt : 0
                          const totalPaid  = cashPaid + stripePaid
                          const remaining  = Math.max(0, Number(r.total_amount) - totalPaid)
                          if (totalPaid > 0) return <span className="text-xs text-gray-400">Reste: {fmt(remaining)}</span>
                          if (stripeAmt > 0 && r.payment_status === 'link_sent') return <span className="text-xs text-orange-500">{fmt(stripeAmt)} demandé</span>
                          return null
                        })()}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setPaymentRes(r)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md" title="Paiement"><CreditCard className="h-4 w-4" /></button>
                        <button onClick={() => handleSendWelcomeEmail(r.id)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-md" title="Email de bienvenue"><Mail className="h-4 w-4" /></button>
                        <button onClick={() => { setEditRes(r); setFormOpen(true) }} className="p-1.5 text-gray-400 hover:text-brand-700 rounded-md"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setArchiveId(r.id)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-md" title="Archiver"><Archive className="h-4 w-4" /></button>
                        <button onClick={() => setDocsRes(r)} className="p-1.5 text-gray-400 hover:text-brand-700 rounded-md" title="Documents"><FileText className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 pt-1 border-t border-gray-100">
                        <button onClick={() => handleConfirm(r.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-2 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                        </button>
                        <button onClick={() => handleRefuse(r.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition-colors">
                          <XCircle className="h-3.5 w-3.5" /> Refuser
                        </button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          {/* Desktop table */}
          <Card padding={false} className="hidden md:block overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">{t('reservations.no_reservations')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{singular}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Arrivée</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Départ</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Nuits</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Paiement</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Source</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => {
                    const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
                    const ps = getPaymentStatus(r)
                    const pb = PAYMENT_BADGE[ps]
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{r.client?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{r.guests} pers.</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{r.villa?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span>{format(parseISO(r.check_in), 'dd/MM/yyyy')}</span>
                          {r.check_in_time && <span className="text-xs text-gray-400 block">{r.check_in_time}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span>{format(parseISO(r.check_out), 'dd/MM/yyyy')}</span>
                          {r.check_out_time && <span className="text-xs text-gray-400 block">{r.check_out_time}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{nights}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {fmt(r.total_amount)}
                          {r.extras && r.extras.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end mt-1">
                              {r.extras.map(e => (
                                <span key={e.id} className="text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{e.name}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="space-y-1">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pb.cls}`}>{pb.label}</span>
                            {(() => {
                              const cashPaid   = r.deposit_amount ?? 0
                              const stripeAmt  = r.stripe_amount != null ? Number(r.stripe_amount) : 0
                              const stripePaid = r.payment_status === 'paid' ? stripeAmt : 0
                              const totalPaid  = cashPaid + stripePaid
                              const remaining  = Math.max(0, Number(r.total_amount) - totalPaid)
                              if (totalPaid <= 0 && stripeAmt <= 0) return null
                              return (
                                <div className="text-xs space-y-0.5 mt-1">
                                  {totalPaid > 0 && (
                                    <p className="text-green-600 font-medium">Payé : {fmt(totalPaid)}</p>
                                  )}
                                  {stripeAmt > 0 && r.payment_status === 'link_sent' && (
                                    <p className="text-orange-500">Demandé : {fmt(stripeAmt)}</p>
                                  )}
                                  {remaining > 0 && totalPaid > 0 && (
                                    <p className="text-gray-400">Reste : {fmt(remaining)}</p>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={SOURCE_COLORS[r.source]}>{r.source}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={STATUS_COLORS[r.status]} dot>{t(`reservations.${r.status}`)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {r.status === 'pending' && (
                              <>
                                <button onClick={() => handleConfirm(r.id)} title="Confirmer" className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                                </button>
                                <button onClick={() => handleRefuse(r.id)} title="Refuser" className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                                  <XCircle className="h-3.5 w-3.5" /> Refuser
                                </button>
                              </>
                            )}
                            <button onClick={() => setPaymentRes(r)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Paiement">
                              <CreditCard className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleSendWelcomeEmail(r.id)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Email de bienvenue">
                              <Mail className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setEditRes(r); setFormOpen(true) }} className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setArchiveId(r.id)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Archiver">
                              <Archive className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDocsRes(r)} className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors" title="Documents">
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      <ReservationForm open={formOpen} reservation={editRes} onClose={() => { setFormOpen(false); setEditRes(null) }} />

      <DocumentsModal
        open={!!docsRes}
        reservation={docsRes}
        onClose={() => setDocsRes(null)}
        onNumberSaved={(id, type, number) => {
          setDocsRes(prev => prev?.id === id
            ? { ...prev, [type === 'receipt' ? 'receipt_number' : 'invoice_number']: number }
            : prev,
          )
        }}
      />

      <PaymentModal
        open={!!paymentRes}
        reservation={paymentRes}
        onClose={() => setPaymentRes(null)}
        onUpdated={(updated) => {
          setPaymentRes(updated)
          fetch()
        }}
      />

      <Modal open={!!archiveId} onClose={() => setArchiveId(null)} title="Archiver la réservation" size="sm"
        footer={<><Button variant="outline" onClick={() => setArchiveId(null)}>{t('common.cancel')}</Button><Button variant="danger" onClick={handleArchive}>Archiver</Button></>}>
        <p className="text-gray-600">Cette réservation sera archivée et n'apparaîtra plus dans la liste principale. Vous pourrez la restaurer depuis l'onglet "Archivées".</p>
      </Modal>

      {/* Export modal */}
      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exporter les réservations"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setExportOpen(false)}>{t('common.cancel')}</Button>
            <Button icon={<Download className="h-4 w-4" />} onClick={handleExport}>Télécharger</Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Format */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Format</p>
            <div className="grid grid-cols-2 gap-3">
              {(['xlsx', 'csv'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    exportFormat === f
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{f === 'xlsx' ? '📊' : '📄'}</span>
                  <span>{f === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Période */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Période</p>
            <div className="space-y-2">
              {([
                { value: 'all',        label: 'Toutes les réservations' },
                { value: 'month',      label: 'Mois en cours' },
                { value: 'last_month', label: 'Mois précédent' },
                { value: 'quarter',    label: 'Trimestre en cours' },
                { value: 'year',       label: 'Année en cours' },
              ] as const).map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exportPeriod"
                    value={opt.value}
                    checked={exportPeriod === opt.value}
                    onChange={() => setExportPeriod(opt.value)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Les réservations archivées ne sont pas incluses dans l'export.
          </p>
        </div>
      </Modal>
    </div>
  )
}
