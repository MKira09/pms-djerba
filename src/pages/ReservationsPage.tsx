import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Pencil, Trash2, Mail, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, differenceInDays } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ReservationForm from '@/components/reservations/ReservationForm'
import { supabase } from '@/lib/supabase'
import { useReservationsStore } from '@/stores/reservations.store'
import { useVillasStore } from '@/stores/villas.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { fmtCurrency, SOURCE_COLORS, STATUS_COLORS } from '@/lib/utils'
import type { Reservation, ReservationStatus, ReservationSource } from '@/types'

type PaymentStatus = 'unpaid' | 'partial' | 'paid'
function getPaymentStatus(r: Reservation): PaymentStatus {
  const deposit = r.deposit_amount ?? 0
  if (deposit <= 0 || r.total_amount === 0) return 'unpaid'
  if (deposit >= r.total_amount) return 'paid'
  return 'partial'
}
const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid:  { label: 'Non payé',      cls: 'bg-red-100 text-red-700' },
  partial: { label: 'Acompte',       cls: 'bg-orange-100 text-orange-700' },
  paid:    { label: 'Payé',          cls: 'bg-green-100 text-green-700' },
}

export default function ReservationsPage() {
  const { t } = useTranslation()
  const { singular } = usePropertyTerm()
  const { reservations, fetch, remove } = useReservationsStore()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [villaFilter, setVillaFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editRes, setEditRes] = useState<Reservation | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetch(); fetchVillas() }, [])

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
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { reservation_id: reservationId },
      })
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

  async function handleDelete() {
    if (!deleteId) return
    try { await remove(deleteId); toast.success('Réservation supprimée.') }
    catch { toast.error('Erreur lors de la suppression.') }
    finally { setDeleteId(null) }
  }

  const statusOpts = [
    { value: 'all', label: 'Tous les statuts' },
    ...(['confirmed', 'pending', 'cancelled', 'checkout'] as ReservationStatus[]).map(s => ({ value: s, label: t(`reservations.${s}`) })),
  ]
  const villaOpts = [{ value: 'all', label: `Toutes les ${singular.toLowerCase()}s` }, ...villas.map(v => ({ value: v.id, label: v.name }))]
  const sourceOpts = [{ value: 'all', label: 'Toutes les sources' }, ...(['airbnb','booking','direct','whatsapp','vrbo','autre'] as ReservationSource[]).map(s => ({ value: s, label: s }))]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reservations.title')}</h1>
          <p className="text-sm text-gray-500">{filtered.length} réservation(s)</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditRes(null); setFormOpen(true) }}>
          {t('reservations.add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Rechercher client ou villa…" value={search} onChange={e => setSearch(e.target.value)} left={<Search className="h-4 w-4" />} className="w-60" />
        <Select options={statusOpts} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44" />
        <Select options={villaOpts} value={villaFilter} onChange={e => setVillaFilter(e.target.value)} className="w-44" />
        <Select options={sourceOpts} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="w-40" />
      </div>

      {/* Mobile cards — visible on small screens only */}
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
                  <div className="flex items-center gap-2">
                    <Badge className={SOURCE_COLORS[r.source]}>{r.source}</Badge>
                    <span className="text-sm font-bold text-brand-800">{fmtCurrency(r.total_amount)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pb.cls}`}>{pb.label}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleSendWelcomeEmail(r.id)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-md" title="Email de bienvenue"><Mail className="h-4 w-4" /></button>
                    <button onClick={() => { setEditRes(r); setFormOpen(true) }} className="p-1.5 text-gray-400 hover:text-brand-700 rounded-md"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleConfirm(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-2 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                    </button>
                    <button
                      onClick={() => handleRefuse(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Desktop table — hidden on mobile */}
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
                      {fmtCurrency(r.total_amount)}
                      {r.extras && r.extras.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end mt-1">
                          {r.extras.map(e => (
                            <span key={e.id} className="text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{e.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pb.cls}`}>{pb.label}</span>
                        {r.deposit_amount != null && r.deposit_amount > 0 && r.deposit_amount < r.total_amount && (
                          <p className="text-xs text-gray-400 mt-0.5">{r.deposit_amount} TND versé</p>
                        )}
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
                            <button
                              onClick={() => handleConfirm(r.id)}
                              title="Confirmer"
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                            </button>
                            <button
                              onClick={() => handleRefuse(r.id)}
                              title="Refuser"
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Refuser
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleSendWelcomeEmail(r.id)}
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                          title="Email de bienvenue"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditRes(r); setFormOpen(true) }} className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
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

      <ReservationForm open={formOpen} reservation={editRes} onClose={() => { setFormOpen(false); setEditRes(null) }} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer la réservation" size="sm"
        footer={<><Button variant="outline" onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button><Button variant="danger" onClick={handleDelete}>Supprimer</Button></>}>
        <p className="text-gray-600">Confirmer la suppression de cette réservation ?</p>
      </Modal>
    </div>
  )
}
