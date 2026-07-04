import { useState } from 'react'
import { CreditCard, CheckCircle2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/types'

interface Props {
  open: boolean
  reservation: Reservation | null
  onClose: () => void
  onUpdated: (updated: Reservation) => void
}

const METHOD_OPTIONS = [
  { value: 'especes',  label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque',   label: 'Chèque' },
  { value: 'carte',    label: 'Carte bancaire' },
  { value: 'autre',    label: 'Autre' },
]

export default function PaymentModal({ open, reservation, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<'link' | 'manual'>('link')
  const [method, setMethod] = useState('especes')
  const [loading, setLoading] = useState(false)
  const [confirmManual, setConfirmManual] = useState(false)

  if (!reservation) return null

  const payStatus = reservation.payment_status ?? 'unpaid'
  const existingLink = reservation.stripe_payment_link

  async function handleSendLink() {
    if (!reservation) return
    if (!reservation.client?.email) {
      toast.error('Ce client n\'a pas d\'email enregistré.')
      return
    }
    setLoading(true)
    const tid = toast.loading('Génération du lien Stripe…')
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { reservation_id: reservation.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''))
      toast.success('Lien de paiement envoyé par email !', { id: tid })
      onUpdated({ ...reservation, payment_status: 'link_sent', stripe_payment_link: data.url })
      onClose()
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)), { id: tid, duration: 8000 })
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    if (!reservation) return
    setLoading(true)
    const tid = toast.loading('Mise à jour…')
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('reservations')
        .update({ payment_status: 'paid', paid_method: method, paid_at: now })
        .eq('id', reservation.id)
      if (error) throw error
      toast.success('Réservation marquée comme payée ✅', { id: tid })
      onUpdated({ ...reservation, payment_status: 'paid', paid_method: method, paid_at: now })
      setConfirmManual(false)
      onClose()
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)), { id: tid })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Paiement de la réservation"
      size="sm"
    >
      <div className="space-y-5">
        {/* Résumé */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{reservation.client?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{reservation.villa?.name} · {reservation.check_in} → {reservation.check_out}</p>
          <p className="text-lg font-bold text-brand-800 pt-1">
            {Number(reservation.total_amount).toLocaleString('fr-TN')} {reservation.currency}
          </p>
          {payStatus === 'link_sent' && (
            <p className="text-xs text-orange-600 font-medium">Lien envoyé — en attente du paiement client</p>
          )}
          {payStatus === 'paid' && (
            <p className="text-xs text-green-600 font-medium">✓ Déjà marquée comme payée</p>
          )}
        </div>

        {/* Tabs */}
        {payStatus !== 'paid' && (
          <>
            <div className="flex gap-1 border-b border-gray-200">
              <button
                onClick={() => setTab('link')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === 'link'
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Lien Stripe
              </button>
              <button
                onClick={() => setTab('manual')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === 'manual'
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Paiement manuel
              </button>
            </div>

            {/* Stripe link tab */}
            {tab === 'link' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Génère un lien de paiement sécurisé Stripe et l'envoie automatiquement par email au client.
                  Le lien expire après <strong>24 heures</strong>.
                </p>
                {!reservation.client?.email && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ce client n'a pas d'email enregistré. Ajoutez-en un dans sa fiche pour pouvoir envoyer le lien.
                  </p>
                )}
                {existingLink && payStatus === 'link_sent' && (
                  <a
                    href={existingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Voir le lien précédent
                  </a>
                )}
                <Button
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={handleSendLink}
                  loading={loading}
                  disabled={!reservation.client?.email}
                  className="w-full"
                >
                  {payStatus === 'link_sent' ? 'Renvoyer un nouveau lien' : 'Envoyer le lien de paiement'}
                </Button>
              </div>
            )}

            {/* Manual tab */}
            {tab === 'manual' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Marquer la réservation comme payée manuellement (espèces, virement, chèque…).
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <Select
                    options={METHOD_OPTIONS}
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                  />
                </div>
                {!confirmManual ? (
                  <Button
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setConfirmManual(true)}
                    className="w-full"
                  >
                    Marquer comme payé
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Confirmer que le paiement de <strong>{Number(reservation.total_amount).toLocaleString('fr-TN')} {reservation.currency}</strong> a bien été reçu en <strong>{METHOD_OPTIONS.find(o => o.value === method)?.label}</strong> ?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setConfirmManual(false)} className="flex-1">
                        Annuler
                      </Button>
                      <Button
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={handleMarkPaid}
                        loading={loading}
                        className="flex-1"
                      >
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Already paid — only show close */}
        {payStatus === 'paid' && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        )}
      </div>
    </Modal>
  )
}
