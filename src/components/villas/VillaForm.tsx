import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { useVillasStore } from '@/stores/villas.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePropertyTerm } from '@/hooks/usePropertyTerm'
import { supabase } from '@/lib/supabase'
import { AMENITY_OPTIONS, cn } from '@/lib/utils'
import type { Villa, VillaStatus } from '@/types'

interface Props { open: boolean; villa: Villa | null; onClose: () => void }

const STATUS_OPTIONS = ['active', 'maintenance', 'disabled'] as VillaStatus[]

const EMPTY: Omit<Villa, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  name: '', description: '', address: '', city: 'Djerba',
  capacity: 4, bedrooms: 2, bathrooms: 1, base_price: 300,
  status: 'active', amenities: [], access_code: '', arrival_info: '', photos: [], wifi_password: '',
}

export default function VillaForm({ open, villa, onClose }: Props) {
  const { t } = useTranslation()
  const { singular } = usePropertyTerm()
  const { add, update } = useVillasStore()
  const { tenant } = useAuthStore()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(villa ? { ...villa } : EMPTY)
  }, [villa, open])

  function set<K extends keyof typeof EMPTY>(k: K, v: typeof EMPTY[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleAmenity(id: string) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(id)
        ? f.amenities.filter(a => a !== id)
        : [...f.amenities, id],
    }))
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Seules les images sont acceptées.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop grande (max 5 Mo).'); return }

    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${tenant?.id ?? 'public'}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('villa-photos')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('villa-photos')
        .getPublicUrl(path)

      set('photos', [...(form.photos ?? []), publicUrl])
      toast.success('Photo ajoutée !')
    } catch (err: unknown) {
      toast.error('Erreur upload : ' + (err instanceof Error ? err.message : 'inconnue'))
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePhoto(url: string) {
    set('photos', (form.photos ?? []).filter(p => p !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Le nom est requis.'); return }
    setLoading(true)
    try {
      if (villa) {
        await update(villa.id, form)
        toast.success('Villa modifiée.')
      } else {
        await add(form)
        toast.success('Villa créée !')
      }
      onClose()
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setLoading(false)
    }
  }

  const statusOpts = STATUS_OPTIONS.map(s => ({ value: s, label: t(`villas.${s}`) }))
  const photos = form.photos ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={villa ? `Modifier la ${singular.toLowerCase()}` : `Ajouter une ${singular.toLowerCase()}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="villa-form" type="submit" loading={loading}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="villa-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={`Nom de la ${singular.toLowerCase()}`} value={form.name} onChange={e => set('name', e.target.value)} required />
          <Select label={t('villas.status')} value={form.status} onChange={e => set('status', e.target.value as VillaStatus)} options={statusOpts} />
        </div>

        <Textarea label={t('villas.description')} value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('villas.address')} value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          <Input label={t('villas.city')} value={form.city} onChange={e => set('city', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label={t('villas.capacity')} type="number" min={1} value={form.capacity} onChange={e => set('capacity', +e.target.value)} />
          <Input label={t('villas.bedrooms')} type="number" min={1} value={form.bedrooms} onChange={e => set('bedrooms', +e.target.value)} />
          <Input label={t('villas.bathrooms')} type="number" min={1} value={form.bathrooms} onChange={e => set('bathrooms', +e.target.value)} />
          <Input label={t('villas.base_price')} type="number" min={0} value={form.base_price} onChange={e => set('base_price', +e.target.value)} />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className={cn(
              'w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors',
              uploadingPhoto && 'opacity-50 cursor-not-allowed'
            )}>
              {uploadingPhoto ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Ajouter</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo</p>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('villas.amenities')}</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAmenity(a.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                  form.amenities.includes(a.id)
                    ? 'border-brand-400 bg-brand-50 text-brand-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <span>{a.icon}</span>
                <span className="truncate text-xs">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('villas.access_code')} value={form.access_code ?? ''} onChange={e => set('access_code', e.target.value)} />
          <Input label={t('villas.wifi_password')} value={form.wifi_password ?? ''} onChange={e => set('wifi_password', e.target.value)} />
        </div>

        <Textarea label={t('villas.arrival_info')} value={form.arrival_info ?? ''} onChange={e => set('arrival_info', e.target.value)} rows={3} />
      </form>
    </Modal>
  )
}
