import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ShieldAlert, Plus, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import { useBlacklistStore } from '@/stores/blacklist.store'
import type { BlacklistEntry } from '@/types'

const EMPTY = { full_name: '', phone: '', email: '', reason: '' }

export default function BlacklistPage() {
  const { entries, loading, fetch, add, remove } = useBlacklistStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteEntry, setDeleteEntry] = useState<BlacklistEntry | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    return !q || [e.full_name, e.phone, e.email, e.reason].some(v => v?.toLowerCase().includes(q))
  })

  function setField(k: keyof typeof EMPTY, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.full_name && !form.phone && !form.email) {
      toast.error('Renseignez au moins un identifiant (nom, téléphone ou email).')
      return
    }
    setSaving(true)
    try {
      await add(form)
      toast.success('Client ajouté à la liste noire.')
      setForm(EMPTY)
      setFormOpen(false)
    } catch {
      toast.error('Erreur lors de l\'ajout.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteEntry) return
    try {
      await remove(deleteEntry.id)
      toast.success('Entrée supprimée.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    } finally {
      setDeleteEntry(null)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Liste noire
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {entries.length} client(s) bloqué(s) · Isolé par agence
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setFormOpen(true) }}>
          Ajouter un client
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        <strong>Comment ça marche :</strong> si le nom, téléphone ou email d'un client correspond à une entrée ici, une alerte rouge s'affiche automatiquement lors de la création d'une réservation.
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher par nom, téléphone, email ou motif…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        left={<Search className="h-4 w-4" />}
        className="max-w-sm"
      />

      {/* Mobile cards */}
      {loading ? (
        <div className="md:hidden py-12 text-center text-gray-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="md:hidden py-12 text-center text-gray-400">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Aucun client en liste noire</p>
        </div>
      ) : (
        <div className="md:hidden space-y-3">
          {filtered.map(e => (
            <Card key={e.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">{e.full_name || '—'}</p>
                <button onClick={() => setDeleteEntry(e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {e.phone && <p className="text-sm text-gray-600">📞 {e.phone}</p>}
              {e.email && <p className="text-sm text-gray-600">✉️ {e.email}</p>}
              {e.reason && <p className="text-sm text-gray-500 italic truncate">"{e.reason}"</p>}
              {e.created_at && <p className="text-xs text-gray-400">{format(parseISO(e.created_at), 'dd/MM/yyyy')}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <Card padding={false} className="hidden md:block">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>Aucun client en liste noire</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Nom</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Téléphone</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Motif</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Ajouté le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-red-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{e.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.created_at ? format(parseISO(e.created_at), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteEntry(e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Ajouter à la liste noire"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button variant="danger" form="blacklist-form" type="submit" loading={saving}>
              Ajouter
            </Button>
          </>
        }
      >
        <form id="blacklist-form" onSubmit={handleAdd} className="space-y-4">
          <p className="text-sm text-gray-500">Renseignez au moins un identifiant. Le client sera alerté lors des prochaines réservations.</p>
          <Input label="Nom complet" value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Ex : Mohamed Ali" />
          <Input label="Téléphone" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+216 XX XXX XXX" />
          <Input label="Email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="exemple@email.com" />
          <Textarea label="Motif (obligatoire)" value={form.reason} onChange={e => setField('reason', e.target.value)} placeholder="Ex : Dégradation de la villa, impayé…" rows={3} required />
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Retirer de la liste noire"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
          </>
        }
      >
        <p className="text-gray-600">
          Retirer <strong>{deleteEntry?.full_name || deleteEntry?.email || deleteEntry?.phone}</strong> de la liste noire ?
        </p>
      </Modal>
    </div>
  )
}
