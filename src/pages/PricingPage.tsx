import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { usePricingStore } from '@/stores/pricing.store'
import { useVillasStore } from '@/stores/villas.store'
import { fmtCurrency } from '@/lib/utils'
import type { SeasonalRate } from '@/types'
import Select from '@/components/ui/Select'

const PRESETS = [
  { name: 'Basse saison (Oct–Mar)',        multiplier: 0.6,  color: 'bg-blue-100 text-blue-700' },
  { name: 'Moyenne saison (Avr–Mai, Sep)', multiplier: 0.8,  color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Haute saison (Jun–Août)',        multiplier: 1.0,  color: 'bg-green-100 text-green-700' },
  { name: 'Vacances & fêtes',              multiplier: 1.25, color: 'bg-amber-100 text-amber-700' },
  { name: 'Last-minute (J-3)',             multiplier: 0.85, color: 'bg-purple-100 text-purple-700' },
]

function RateForm({ open, rate, onClose }: { open: boolean; rate: SeasonalRate | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { add, update } = usePricingStore()
  const { villas } = useVillasStore()
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', multiplier: 1.0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(rate ? { name: rate.name, start_date: rate.start_date, end_date: rate.end_date, multiplier: rate.multiplier }
      : { name: '', start_date: '', end_date: '', multiplier: 1.0 })
  }, [rate, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (rate) { await update(rate.id, form); toast.success('Tarif modifié.') }
      else { await add(form); toast.success('Tarif ajouté !') }
      onClose()
    } catch { toast.error('Erreur.') } finally { setLoading(false) }
  }

  // Preview: average villa base price
  const avgBase = villas.length > 0 ? villas.reduce((s, v) => s + v.base_price, 0) / villas.length : 300
  const previewPrice = Math.round(avgBase * form.multiplier)

  return (
    <Modal open={open} onClose={onClose} title={rate ? 'Modifier la période' : t('pricing.add_rate')} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button form="rate-form" type="submit" loading={loading}>{t('common.save')}</Button></>}>
      <form id="rate-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('pricing.period_name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="ex: Haute saison 2026" />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('pricing.start_date')} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
          <Input label={t('pricing.end_date')} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('pricing.multiplier')}</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0.3} max={2.0} step={0.05} value={form.multiplier}
              onChange={e => setForm(f => ({ ...f, multiplier: parseFloat(e.target.value) }))}
              className="flex-1 accent-brand-800" />
            <span className="font-bold text-brand-800 w-12 text-right">×{form.multiplier.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">{t('pricing.preview')} (prix moyen)</span>
          <span className="font-bold text-gray-900">{fmtCurrency(previewPrice)}<span className="text-xs font-normal text-gray-400">/nuit</span></span>
        </div>
      </form>
    </Modal>
  )
}

export default function PricingPage() {
  const { t } = useTranslation()
  const { rates, fetch, remove } = usePricingStore()
  const { villas, fetch: fetchVillas } = useVillasStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editRate, setEditRate] = useState<SeasonalRate | null>(null)
  const [refVilla, setRefVilla] = useState('')

  useEffect(() => { fetch(); fetchVillas() }, [])

  const refPrice = refVilla ? villas.find(v => v.id === refVilla)?.base_price ?? 300 : 300

  const villaOpts = [{ value: '', label: 'Prix moyen' }, ...villas.map(v => ({ value: v.id, label: v.name }))]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pricing.title')}</h1>
          <p className="text-sm text-gray-500">{rates.length} période(s) configurée(s)</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditRate(null); setFormOpen(true) }}>
          {t('pricing.add_rate')}
        </Button>
      </div>

      {/* Reference villa selector */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Zap className="h-4 w-4 text-amber-500" />
            {t('pricing.base_price')} :
          </div>
          <Select options={villaOpts} value={refVilla} onChange={e => setRefVilla(e.target.value)} className="w-48" />
          <span className="font-bold text-brand-800 text-lg">{fmtCurrency(refPrice)}/nuit</span>
        </div>
      </Card>

      {/* Presets reference */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">{t('pricing.presets')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <div key={p.name} className="border border-gray-200 rounded-xl p-3">
              <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${p.color}`}>×{p.multiplier}</div>
              <p className="text-xs text-gray-600">{p.name}</p>
              <p className="font-bold text-gray-900 mt-1">{fmtCurrency(Math.round(refPrice * p.multiplier))}/nuit</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom rates */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Mes périodes tarifaires</h2>
        {rates.length === 0 ? (
          <Card className="text-center py-12 text-gray-400">Aucune période configurée.</Card>
        ) : (
          <div className="space-y-3">
            {rates.map(r => (
              <Card key={r.id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(r.start_date), 'dd/MM/yyyy')} → {format(parseISO(r.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-brand-800">×{r.multiplier}</p>
                  <p className="text-xs text-gray-500">{fmtCurrency(Math.round(refPrice * r.multiplier))}/nuit</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditRate(r); setFormOpen(true) }} className="p-1.5 text-gray-400 hover:text-brand-700 rounded-md hover:bg-brand-50"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RateForm open={formOpen} rate={editRate} onClose={() => { setFormOpen(false); setEditRate(null) }} />
    </div>
  )
}
