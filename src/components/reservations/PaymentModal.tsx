import { useState } from 'react'
import { CreditCard, CheckCircle2, ExternalLink, AlertCircle, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Reservation } from '@/types'

interface Props {
  open: boolean
  reservation: Reservation | null
  onClose: () => void
  onUpdated: (updated: Reservation) => void
}

const METHOD_OPTIONS = [
  { value: 'especes',   label: 'Espèces' },
  { value: 'virement',  label: 'Virement bancaire' },
  { value: 'cheque',    label: 'Chèque' },
  { value: 'carte',     label: 'Carte bancaire' },
  { value: 'paypal',    label: 'PayPal' },
  { value: 'autre',     label: 'Autre' },
]

const QUICK_PCTS = [30, 50, 70]

const TAB_LABELS: Record<string, string> = {
  stripe:   'Stripe',
  paypal:   'PayPal',
  virement: 'Virement',
  manual:   'Manuel',
}

export default function PaymentModal({ open, reservation, onClose, onUpdated }: Props) {
  const { tenant } = useAuthStore()
  const stripeConnected  = !!(tenant?.stripe_account_id)
  const paypalConfigured = !!(tenant?.paypal_me)
  const ribConfigured    = !!(tenant?.bank_iban)

  const [tab, setTab] = useState<'stripe' | 'paypal' | 'virement' | 'manual'>('stripe')

  // Amount picker — shared across stripe / paypal / virement tabs
  const [amountType, setAmountType] = useState<'total' | 'deposit'>('total')
  const [pctInput, setPctInput] = useState<string>('30')
  const [amtInput, setAmtInput] = useState<string>('')
  const [inputMode, setInputMode] = useState<'pct' | 'amount'>('pct')

  // Manual payment
  const [method, setMethod] = useState('especes')
  const [loading, setLoading] = useState(false)
  const [confirmManual, setConfirmManual] = useState(false)

  if (!reservation) return null

  const payStatus    = reservation.payment_status ?? 'unpaid'
  const existingLink = reservation.stripe_payment_link
  const total        = Number(reservation.total_amount)
  const cur          = reservation.currency ?? 'TND'

  const sendAmount: number = (() => {
    if (amountType === 'total') return total
    if (inputMode === 'pct') {
      const pct = parseFloat(pctInput)
      if (!pct || pct <= 0 || pct > 100) return 0
      return Math.round(total * pct) / 100
    }
    const amt = parseFloat(amtInput)
    return amt > 0 && amt <= total ? amt : 0
  })()

  const sendAmountValid = sendAmount > 0

  function handlePctClick(pct: number) {
    setInputMode('pct')
    setPctInput(String(pct))
  }

  async function handleSendStripeLink() {
    if (!reservation) return
    if (!reservation.client?.email) { toast.error('Ce client n\'a pas d\'email enregistré.'); return }
    if (!sendAmountValid)            { toast.error('Montant invalide.'); return }
    setLoading(true)
    const tid = toast.loading('Génération du lien Stripe…')
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { reservation_id: reservation.id, amount: sendAmount },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''))
      toast.success('Lien de paiement envoyé par email !', { id: tid })
      onUpdated({ ...reservation, payment_status: 'link_sent', stripe_payment_link: data.url, stripe_amount: sendAmount })
      onClose()
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)), { id: tid, duration: 8000 })
    } finally {
      setLoading(false)
    }
  }

  async function handleSendPaymentInfo(m: 'paypal' | 'virement') {
    if (!reservation) return
    if (!reservation.client?.email) { toast.error('Ce client n\'a pas d\'email enregistré.'); return }
    if (!sendAmountValid)            { toast.error('Montant invalide.'); return }
    setLoading(true)
    const tid = toast.loading(m === 'paypal' ? 'Envoi du lien PayPal…' : 'Envoi des coordonnées bancaires…')
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-info', {
        body: { reservation_id: reservation.id, method: m, amount: sendAmount },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''))
      toast.success(m === 'paypal' ? 'Lien PayPal envoyé par email !' : 'Coordonnées bancaires envoyées !', { id: tid })
      onUpdated({ ...reservation, payment_status: 'link_sent', stripe_amount: sendAmount })
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

  const previewLabel =
    tab === 'stripe'   ? 'Le client recevra un lien pour :' :
    tab === 'paypal'   ? 'Le client devra vous envoyer :' :
                         'Montant à virer :'

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
                Paiement demandé pour {Number(reservation.stripe_amount).toLocaleString('fr-TN')} {cur}
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
            <div className="flex gap-0 border-b border-gray-200">
              {(['stripe', 'paypal', 'virement', 'manual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? 'border-brand-700 text-brand-800'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            {/* ── Shared amount picker (stripe / paypal / virement) ── */}
            {tab !== 'manual' && (
              <div className="space-y-4">
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
                          {type === 'total' ? `${total.toLocaleString('fr-TN')} ${cur}` : 'Montant partiel'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {amountType === 'deposit' && (
                  <div className="space-y-3">
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
                    {inputMode === 'pct' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} max={100} value={pctInput}
                          onChange={e => setPctInput(e.target.value)}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="30"
                        />
                        <span className="text-sm text-gray-500">% du total</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} max={total} value={amtInput}
                          onChange={e => setAmtInput(e.target.value)}
                          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">{cur}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount preview */}
                <div className={`rounded-xl px-4 py-3 border ${sendAmountValid ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-gray-500 mb-0.5">{previewLabel}</p>
                  <p className={`text-xl font-bold ${sendAmountValid ? 'text-teal-700' : 'text-gray-400'}`}>
                    {sendAmountValid ? sendAmount.toLocaleString('fr-TN') : '—'} {cur}
                  </p>
                  {sendAmountValid && amountType === 'deposit' && sendAmount < total && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Reste après acompte : {(total - sendAmount).toLocaleString('fr-TN')} {cur}
                    </p>
                  )}
                  {tab === 'stripe' && (
                    <p className="text-xs text-gray-400 mt-1">Lien valable 24h · Paiement sécurisé par carte</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Stripe tab ─────────────────────────────────────────── */}
            {tab === 'stripe' && (
              <div className="space-y-3">
                {!stripeConnected && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Compte Stripe non connecté</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Connectez votre compte dans{' '}
                        <Link to="/settings" onClick={onClose} className="underline font-medium">
                          Paramètres → Recevoir mes paiements
                        </Link>.
                      </p>
                    </div>
                  </div>
                )}
                {!reservation.client?.email && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ce client n'a pas d'email enregistré. Ajoutez-en un dans sa fiche.
                  </p>
                )}
                {existingLink && payStatus === 'link_sent' && (
                  <a href={existingLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Voir le lien précédent
                  </a>
                )}
                <Button
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={handleSendStripeLink}
                  loading={loading}
                  disabled={!stripeConnected || !reservation.client?.email || !sendAmountValid}
                  className="w-full"
                >
                  {payStatus === 'link_sent' ? 'Renvoyer un nouveau lien' : 'Envoyer le lien de paiement'}
                </Button>
              </div>
            )}

            {/* ── PayPal tab ─────────────────────────────────────────── */}
            {tab === 'paypal' && (
              <div className="space-y-3">
                {!paypalConfigured ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">PayPal non configuré</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Ajoutez votre lien PayPal.me dans{' '}
                        <Link to="/settings" onClick={onClose} className="underline font-medium">
                          Paramètres → PayPal
                        </Link>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <span className="font-extrabold text-blue-700 text-base leading-none">P</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Votre lien PayPal.me</p>
                      <p className="text-sm font-medium text-blue-700 truncate">{tenant?.paypal_me}</p>
                    </div>
                  </div>
                )}
                {!reservation.client?.email && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ce client n'a pas d'email enregistré. Ajoutez-en un dans sa fiche.
                  </p>
                )}
                <Button
                  onClick={() => handleSendPaymentInfo('paypal')}
                  loading={loading}
                  disabled={!paypalConfigured || !reservation.client?.email || !sendAmountValid}
                  className="w-full"
                >
                  Envoyer le lien PayPal par email
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  Le client reçoit votre lien PayPal.me avec le montant à vous envoyer.
                </p>
              </div>
            )}

            {/* ── Virement tab ────────────────────────────────────────── */}
            {tab === 'virement' && (
              <div className="space-y-3">
                {!ribConfigured ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">RIB non configuré</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Ajoutez vos coordonnées bancaires dans{' '}
                        <Link to="/settings" onClick={onClose} className="underline font-medium">
                          Paramètres → Virement bancaire
                        </Link>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Landmark className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coordonnées bancaires</p>
                    </div>
                    {[
                      { label: 'Titulaire', value: tenant?.bank_holder },
                      { label: 'Banque',    value: tenant?.bank_name },
                      { label: 'IBAN',      value: tenant?.bank_iban },
                      { label: 'BIC',       value: tenant?.bank_bic },
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500 shrink-0">{row.label}</span>
                        <span className="font-mono text-gray-800 text-right break-all">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!reservation.client?.email && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ce client n'a pas d'email enregistré. Ajoutez-en un dans sa fiche.
                  </p>
                )}
                <Button
                  icon={<Landmark className="h-4 w-4" />}
                  onClick={() => handleSendPaymentInfo('virement')}
                  loading={loading}
                  disabled={!ribConfigured || !reservation.client?.email || !sendAmountValid}
                  className="w-full"
                >
                  Envoyer les coordonnées bancaires
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  Le client reçoit votre IBAN, le montant et la référence de paiement.
                </p>
              </div>
            )}

            {/* ── Manuel tab ──────────────────────────────────────────── */}
            {tab === 'manual' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Marquer la réservation comme payée manuellement (espèces, virement reçu, chèque…).
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement reçu</label>
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
