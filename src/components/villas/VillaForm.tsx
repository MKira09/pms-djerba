import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { useVillasStore } from '@/stores/villas.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePropertyTerm, PROPERTY_TYPE_LIST } from '@/hooks/usePropertyTerm'
import { supabase } from '@/lib/supabase'
import { AMENITY_OPTIONS, cn } from '@/lib/utils'
import type { Villa, VillaStatus, ContactNumber } from '@/types'

interface Props { open: boolean; villa: Villa | null; onClose: () => void }

const STATUS_OPTIONS = ['active', 'maintenance', 'disabled'] as VillaStatus[]

const EMPTY: Omit<Villa, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  name: '', description: '', address: '', city: 'Djerba',
  capacity: 4, bedrooms: 2, bathrooms: 1, base_price: 300,
  status: 'active', amenities: [], access_code: '', arrival_info: '', photos: [],
  wifi_network: '', wifi_password: '', contact_numbers: [],
  property_type: null,
}

export default function VillaForm({ open, villa, onClose }: Props) {
  const { t } = useTranslation()
  const { singular, isMultiType, types } = usePropertyTerm()
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

  function addContact() {
    set('contact_numbers', [...(form.contact_numbers ?? []), { name: '', role: '', phone: '' }])
  }
  function updateContact(idx: number, field: keyof ContactNumber, value: string) {
    set('contact_numbers', (form.contact_numbers ?? []).map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }
  function removeContact(idx: number) {
    set('contact_numbers', (form.contact_numbers ?? []).filter((_, i) => i !== idx))
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
  const typeOpts = (isMultiType ? types : PROPERTY_TYPE_LIST).map(t => ({ value: t, label: t }))
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
          <div className="grid grid-cols-2 xs:grid-cols-2 gap-3">
            <Select label={t('villas.status')} value={form.status} onChange={e => set('status', e.target.value as VillaStatus)} options={statusOpts} />
            <Select
              label="Type de bien"
              value={form.property_type ?? types[0]}
              onChange={e => set('property_type', e.target.value)}
              options={typeOpts}
            />
          </div>
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

        {/* ─── Informations d'arrivée ─── */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            📧 Informations d'arrivée
            <span className="font-normal text-gray-400 ml-1">(incluses dans l'email de bienvenue)</span>
          </h3>

          {/* Code + WiFi */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Code d'accès" value={form.access_code ?? ''} onChange={e => set('access_code', e.target.value)} placeholder="Ex: 1234" />
            <Input label="Réseau WiFi" value={form.wifi_network ?? ''} onChange={e => set('wifi_network', e.target.value)} placeholder="Nom du réseau" />
            <Input label="Mot de passe WiFi" value={form.wifi_password ?? ''} onChange={e => set('wifi_password', e.target.value)} placeholder="Mot de passe" />
          </div>

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Personnes à contacter</label>
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {(form.contact_numbers ?? []).map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="Nom (ex: Ahmed)"
                    value={c.name}
                    onChange={e => updateContact(i, 'name', e.target.value)}
                  />
                  <input
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="Rôle (gardien, urgences…)"
                    value={c.role}
                    onChange={e => updateContact(i, 'role', e.target.value)}
                  />
                  <input
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="+216 XX XXX XXX"
                    value={c.phone}
                    onChange={e => updateContact(i, 'phone', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(form.contact_numbers ?? []).length === 0 && (
                <p className="text-xs text-gray-400 italic">Aucun contact ajouté.</p>
              )}
            </div>
          </div>

          {/* Instructions d'accès */}
          <Textarea label="Instructions d'accès" value={form.arrival_info ?? ''} onChange={e => set('arrival_info', e.target.value)} rows={3} placeholder="Ex: Clé sous le pot de fleurs à gauche de la porte, interphone 12…" />
        </div>
      </form>
    </Modal>
  )
}
