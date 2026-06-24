import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, differenceInDays } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ReservationForm from '@/components/reservations/ReservationForm'
import { useReservationsStore } from '@/stores/reservations.store'
import { useVillasStore } from '@/stores/villas.store'
import { fmtCurrency, SOURCE_COLORS, STATUS_COLORS } from '@/lib/utils'
import type { Reservation, ReservationStatus, ReservationSource } from '@/types'

export default function ReservationsPage() {
  const { t } = useTranslation()
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
  const villaOpts = [{ value: 'all', label: 'Toutes les villas' }, ...villas.map(v => ({ value: v.id, label: v.name }))]
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

      {/* Table */}
      <Card padding={false} className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">{t('reservations.no_reservations')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Villa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Arrivée</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Départ</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nuits</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Source</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => {
                const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
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
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCurrency(r.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={SOURCE_COLORS[r.source]}>{r.source}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={STATUS_COLORS[r.status]} dot>{t(`reservations.${r.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
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
