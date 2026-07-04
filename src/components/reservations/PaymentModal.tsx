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

const QUICK_PCTS = [30, 50, 70]

export default function PaymentModal({ open, reservation, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<'link' | 'manual'>('link')
  // Stripe amount picker
  const [amountType, setAmountType] = useState<'total' | 'deposit'>('total')
  const [pctInput, setPctInput] = useState<string>('30')
  const [amtInput, setAmtInput] = useState<string>('')
  const [inputMode, setInputMode] = useState<'pct' | 'amount'>('pct')
  // Manual payment
  const [method, setMethod] = useState('especes')
  const [loading, setLoading] = useState(false)
  const [confirmManual, setConfirmManual] = useState(false)

  if (!reservation) return null

  const payStatus = reservation.payment_status ?? 'unpaid'
  const existingLink = reservation.stripe_payment_link
  const total = Number(reservation.total_amount)
  const cur = reservation.currency ?? 'TND'

  // Computed Stripe amount to send
  const stripeAmount: number = (() => {
    if (amountType === 'total') return total
    if (inputMode === 'pct') {
      const pct = parseFloat(pctInput)
      if (!pct || pct <= 0 || pct > 100) return 0
      return Math.round(total * pct) / 100
    }
    const amt = parseFloat(amtInput)
    return amt > 0 && amt <= total ? amt : 0
  })()

  const stripeAmountValid = stripeAmount > 0

  function handlePctClick(pct: number) {
    setInputMode('pct')
    setPctInput(String(pct))
  }

  async function handleSendLink() {
    if (!reservation) return
    if (!reservation.client?.email) {
      toast.error('Ce client n\'a pas d\'email enregistré.')
      return
    }
    if (!stripeAmountValid) {
      toast.error('Montant invalide.')
      return
    }
    setLoading(true)
    const tid = toast.loading('Génération du lien Stripe…')
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { reservation_id: reservation.id, amount: stripeAmount },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''))
      toast.success('Lien de paiement envoyé par email !', { id: tid })
      onUpdated({
        ...reservation,
        payment_status: 'link_sent',
        stripe_payment_link: data.url,
        stripe_amount: stripeAmount,
      })
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
    <Modal open={open} onClose={onClose} title="Paiement de la réservation" size="sm">
      <div className="space-y-5">

        {/* Résumé */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
          <p className="text-sm font-semibold text-gray-900">{reservation.client?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{reservation.villa?.name} · {reservation.check_in} → {reservation.check_out}</p>
          <p className="text-base font-bold text-brand-800 pt-1.5">
            Total : {total.toLocaleString('fr-TN')} {cur}
          </p>
          {payStatus === 'link_sent' && reservation.stripe_amount != null && (
            <div className="text-xs space-y-0.5 pt-1">
              <p className="text-orange-600 font-medium">
                Lien envoyé pour {Number(reservation.stripe_amount).toLocaleString('fr-TN')} {cur}
              </p>
              {Number(reservation.stripe_amount) < total && (
                <p className="text-gray-400">
                  Reste : {(total - Number(reservation.stripe_amount)).toLocaleString('fr-TN')} {cur}
                </p>
              )}
            </div>
          )}
          {payStatus === 'paid' && (
            <p className="text-xs text-green-600 font-medium pt-1">✓ Déjà marquée comme payée</p>
          )}
        </div>

        {payStatus !== 'paid' && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {(['link', 'manual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? 'border-brand-700 text-brand-800'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'link' ? 'Lien Stripe' : 'Paiement manuel'}
                </button>
              ))}
            </div>

            {/* ── Stripe link tab ─────────────────────────────────────────── */}
            {tab === 'link' && (
              <div className="space-y-5">
                {!reservation.client?.email && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ce client n'a pas d'email enregistré. Ajoutez-en un dans sa fiche.
                  </p>
                )}

                {/* Amount type */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Montant à demander</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['total', 'deposit'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setAmountType(type)}
                        className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                          amountType === type
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className="block font-semibold">
                          {type === 'total' ? 'Montant total' : 'Acompte'}
                        </span>
                        <span className="block text-xs mt-0.5 opacity-70">
                          {type === 'total'
                            ? `${total.toLocaleString('fr-TN')} ${cur}`
                            : 'Montant partiel'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deposit picker */}
                {amountType === 'deposit' && (
                  <div className="space-y-3">
                    {/* Quick pct buttons */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Pourcentage rapide</p>
                      <div className="flex gap-2">
                        {QUICK_PCTS.map(pct => (
                          <button
                            key={pct}
                            onClick={() => handlePctClick(pct)}
                            className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                              inputMode === 'pct' && pctInput === String(pct)
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => setInputMode('amount')}
                          className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            inputMode === 'amount'
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          Autre
                        </button>
                      </div>
                    </div>

                    {/* Pct or amount input */}
                    {inputMode === 'pct' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={pctInput}
                          onChange={e => setPctInput(e.target.value)}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="30"
                        />
                        <span className="text-sm text-gray-500">% du total</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={total}
                          value={amtInput}
                          onChange={e => setAmtInput(e.target.value)}
                          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">{cur}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview */}
                <div className={`rounded-xl px-4 py-3 border ${stripeAmountValid ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-gray-500 mb-0.5">Le client recevra un lien pour :</p>
                  <p className={`text-xl font-bold ${stripeAmountValid ? 'text-teal-700' : 'text-gray-400'}`}>
                    {stripeAmountValid ? stripeAmount.toLocaleString('fr-TN') : '—'} {cur}
                  </p>
                  {stripeAmountValid && amountType === 'deposit' && stripeAmount < total && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Reste après acompte : {(total - stripeAmount).toLocaleString('fr-TN')} {cur}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Lien valable 24h · Paiement sécurisé par carte</p>
                </div>

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
                  disabled={!reservation.client?.email || !stripeAmountValid}
                  className="w-full"
                >
                  {payStatus === 'link_sent' ? 'Renvoyer un nouveau lien' : 'Envoyer le lien de paiement'}
                </Button>
              </div>
            )}

            {/* ── Manual tab ──────────────────────────────────────────────── */}
            {tab === 'manual' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Marquer la réservation comme payée manuellement (espèces, virement, chèque…).
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <Select options={METHOD_OPTIONS} value={method} onChange={e => setMethod(e.target.value)} />
                </div>
                {!confirmManual ? (
                  <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setConfirmManual(true)} className="w-full">
                    Marquer comme payé
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Confirmer que le paiement de{' '}
                      <strong>{total.toLocaleString('fr-TN')} {cur}</strong> a bien été reçu en{' '}
                      <strong>{METHOD_OPTIONS.find(o => o.value === method)?.label}</strong> ?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setConfirmManual(false)} className="flex-1">Annuler</Button>
                      <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={handleMarkPaid} loading={loading} className="flex-1">
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {payStatus === 'paid' && (
          <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
        )}
      </div>
    </Modal>
  )
}
