import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Bed, Bath, Users, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import VillaForm from '@/components/villas/VillaForm'
import { useVillasStore } from '@/stores/villas.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { VILLA_STATUS_COLORS, PLAN_LIMITS, AMENITY_OPTIONS } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import type { Villa } from '@/types'

export default function VillasPage() {
  const { t } = useTranslation()
  const { villas, fetch, remove, loading } = useVillasStore()
  const { tenant } = useAuthStore()
  const { singular, plural, isMultiType } = usePropertyTerm()
  const searchLabel = isMultiType ? 'un bien' : `une ${singular.toLowerCase()}`
  const [searchParams] = useSearchParams()
  const typeFilter = searchParams.get('type')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editVilla, setEditVilla] = useState<Villa | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  const isFoundingMember = !!tenant?.founding_member
  const limit = isFoundingMember ? Infinity : PLAN_LIMITS[tenant?.plan ?? 'starter']
  const filtered = villas.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || (v.property_type || singular) === typeFilter
    return matchSearch && matchType
  })

  const groups: { type: string; items: Villa[] }[] = Object.entries(
    filtered.reduce<Record<string, Villa[]>>((acc, v) => {
      const key = v.property_type || singular
      if (!acc[key]) acc[key] = []
      acc[key].push(v)
      return acc
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([type, items]) => ({ type, items }))

  const isGrouped = groups.length > 1

  async function handleDelete() {
    if (!deleteId) return
    try {
      await remove(deleteId)
      toast.success(`${singular} supprimée.`)
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
          <h1 className="text-2xl font-bold text-gray-900">
            {typeFilter && isMultiType ? `Mes ${typeFilter}s` : `Mes ${plural}`}
          </h1>
          <p className="text-sm text-gray-500">
            {villas.filter(v => v.status === 'active').length} actifs
            {isFoundingMember
              ? <span className="ml-2 text-amber-600 font-medium">★ Membre fondateur — biens illimités</span>
              : <> · limite plan : {limit}</>
            }
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Ajouter une {singular}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={`${t('common.search')} ${searchLabel}…`}
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
          <p>Aucune {singular.toLowerCase()} pour l'instant. Ajoutez votre première {singular.toLowerCase()} !</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map(({ type, items }) => (
            <div key={type}>
              {isGrouped && (
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-semibold text-gray-700">{type}s</h2>
                  <span className="text-sm text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(villa => (
                  <VillaCard
                    key={villa.id}
                    villa={villa}
                    onEdit={() => { setEditVilla(villa); setFormOpen(true) }}
                    onDelete={() => setDeleteId(villa.id)}
                  />
                ))}
              </div>
            </div>
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
        title={`Supprimer la ${singular.toLowerCase()}`}
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
  const { isMultiType } = usePropertyTerm()
  const { fmt } = useCurrency()
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
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <Badge className={VILLA_STATUS_COLORS[villa.status]} dot>
            {t(`villas.${villa.status}`)}
          </Badge>
          {isMultiType && villa.property_type && (
            <span className="bg-white/90 text-brand-800 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              {villa.property_type}
            </span>
          )}
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
          <span className="font-bold text-brand-800">{fmt(villa.base_price)}<span className="text-xs font-normal text-gray-400">/nuit</span></span>
          <div className="flex gap-1">
            <button
              title="Copier le lien de réservation"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/book/${villa.slug || villa.id}`)
                toast.success('Lien copié !')
              }}
              className="p-1.5 rounded-md text-gray-400 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
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
