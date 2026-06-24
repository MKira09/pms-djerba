import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Pencil, Trash2, Bed, Bath, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import VillaForm from '@/components/villas/VillaForm'
import { useVillasStore } from '@/stores/villas.store'
import { useAuthStore } from '@/stores/auth.store'
import { fmtCurrency, VILLA_STATUS_COLORS, PLAN_LIMITS, AMENITY_OPTIONS } from '@/lib/utils'
import type { Villa } from '@/types'

export default function VillasPage() {
  const { t } = useTranslation()
  const { villas, fetch, remove, loading } = useVillasStore()
  const { tenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editVilla, setEditVilla] = useState<Villa | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  const limit = PLAN_LIMITS[tenant?.plan ?? 'starter']
  const filtered = villas.filter(v => v.name.toLowerCase().includes(search.toLowerCase()))

  async function handleDelete() {
    if (!deleteId) return
    try {
      await remove(deleteId)
      toast.success('Villa supprimée.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    } finally {
      setDeleteId(null)
    }
  }

  function openCreate() {
    if (villas.length >= limit) { toast.error(t('villas.plan_limit')); return }
    setEditVilla(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('villas.title')}</h1>
          <p className="text-sm text-gray-500">{villas.filter(v => v.status === 'active').length} actives · limite plan : {limit}</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('villas.add_villa')}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={`${t('common.search')} une villa…`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        left={<Search className="h-4 w-4" />}
        className="max-w-sm"
      />

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">🏠</p>
          <p>{t('villas.no_villas')}</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(villa => (
            <VillaCard
              key={villa.id}
              villa={villa}
              onEdit={() => { setEditVilla(villa); setFormOpen(true) }}
              onDelete={() => setDeleteId(villa.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <VillaForm
        open={formOpen}
        villa={editVilla}
        onClose={() => { setFormOpen(false); setEditVilla(null) }}
      />

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Supprimer la villa"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('common.delete')}</Button>
          </>
        }
      >
        <p className="text-gray-600">{t('villas.delete_confirm')}</p>
      </Modal>
    </div>
  )
}

function VillaCard({ villa, onEdit, onDelete }: { villa: Villa; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  return (
    <Card padding={false} className="overflow-hidden">
      {/* Photo */}
      <div className="h-36 relative overflow-hidden">
        {villa.photos?.[0] ? (
          <img src={villa.photos[0]} alt={villa.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
            <span className="text-4xl">🏖️</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={VILLA_STATUS_COLORS[villa.status]} dot>
            {t(`villas.${villa.status}`)}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">{villa.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{villa.description ?? villa.city}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {villa.capacity}</span>
          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {villa.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {villa.bathrooms}</span>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1">
          {villa.amenities.slice(0, 4).map(aid => {
            const a = AMENITY_OPTIONS.find(o => o.id === aid)
            return a ? <span key={aid} className="text-sm" title={a.label}>{a.icon}</span> : null
          })}
          {villa.amenities.length > 4 && <span className="text-xs text-gray-400">+{villa.amenities.length - 4}</span>}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="font-bold text-brand-800">{fmtCurrency(villa.base_price)}<span className="text-xs font-normal text-gray-400">/nuit</span></span>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-brand-700 transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
