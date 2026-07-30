import { useState } from 'react'
import { Download, Mail, FileText, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { buildInvoiceHtml, buildReceiptHtml, downloadAsPdf } from '@/lib/invoiceTemplate'
import { fmtCurrency } from '@/lib/utils'
import type { Reservation } from '@/types'

interface Props {
  open: boolean
  reservation: Reservation | null
  onClose: () => void
  onNumberSaved?: (id: string, type: 'receipt' | 'invoice', number: string) => void
}

type LoadingKey = 'receipt-dl' | 'receipt-email' | 'invoice-dl' | 'invoice-email' | null

async function getOrCreateDocNumber(
  r: Reservation,
  type: 'receipt' | 'invoice',
  tenantId: string,
): Promise<string> {
  const existing = type === 'receipt' ? r.receipt_number : r.invoice_number
  if (existing) return existing

  const col = type === 'receipt' ? 'receipt_number' : 'invoice_number'
  const prefix = type === 'receipt' ? 'ACOMPTE' : 'FAC'
  const year = new Date().getFullYear()

  const { count } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not(col, 'is', null)

  const num = `${prefix}-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
  await supabase.from('reservations').update({ [col]: num }).eq('id', r.id)
  return num
}

// Retourne le chemin de stockage (pas la signed URL) — la fonction view-invoice
// sert le fichier avec les bons headers via service role, en contournant le
// Content-Type: text/plain que Supabase Storage force sur les .html (politique anti-XSS CDN).
async function uploadDocumentHtml(
  html: string,
  tenantId: string,
  filename: string,
): Promise<string | null> {
  try {
    const year = new Date().getFullYear()
    const path = `${tenantId}/${year}/${filename}`
    const blob = new Blob(['﻿' + html], { type: 'text/html; charset=utf-8' })
    const { error } = await supabase.storage
      .from('factures')
      .upload(path, blob, { contentType: 'text/html; charset=utf-8', upsert: true })
    if (error) { console.warn('[uploadDocumentHtml]', error); return null }
    return path
  } catch (e) {
    console.warn('[uploadDocumentHtml]', e)
    return null
  }
}

export default function DocumentsModal({ open, reservation, onClose, onNumberSaved }: Props) {
  const { tenant } = useAuthStore()
  const [loading, setLoading] = useState<LoadingKey>(null)

  if (!reservation || !tenant) return null

  const deposit = reservation.deposit_amount ?? 0
  const total   = reservation.total_amount ?? 0
  const hasDeposit = deposit > 0
  const hasEmail   = !!reservation.client?.email
  const currency   = tenant.currency ?? 'EUR'
  const fmt = (n: number) => fmtCurrency(n, currency)

  async function handleDocument(type: 'receipt' | 'invoice', action: 'download' | 'email') {
    setLoading(`${type}-${action}` as LoadingKey)
    try {
      const docNumber = await getOrCreateDocNumber(reservation!, type, tenant!.id)
      onNumberSaved?.(reservation!.id, type, docNumber)

      const year = new Date().getFullYear()
      const prefix = type === 'receipt' ? 'recu' : 'facture'
      const filename = `${prefix}_${docNumber.replace(/-/g, '_')}_${year}.html`

      const html = type === 'receipt'
        ? buildReceiptHtml(reservation!, tenant!, docNumber)
        : buildInvoiceHtml(reservation!, tenant!, docNumber)

      if (action === 'download') {
        const pdfFilename = filename.replace('.html', '.pdf')
        await downloadAsPdf(html, pdfFilename)
        toast.success(`${type === 'receipt' ? 'Reçu' : 'Facture'} téléchargé`)
      } else {
        const docPath = await uploadDocumentHtml(html, tenant!.id, filename)
        const { error } = await supabase.functions.invoke('send-payment-doc', {
          body: { reservation_id: reservation!.id, doc_type: type, doc_path: docPath },
        })
        if (error) throw error
        toast.success(`Email envoyé à ${reservation!.client?.email}`)
      }
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Documents de paiement" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {reservation.client?.full_name ?? '—'} · {reservation.villa?.name ?? '—'}
        </p>

        {/* ── Reçu d'acompte ── */}
        {hasDeposit && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-gray-800">Reçu d'acompte</span>
              {reservation.receipt_number && (
                <span className="ml-auto text-xs text-gray-400 font-mono">{reservation.receipt_number}</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Acompte : <strong>{fmt(deposit)}</strong>
              {reservation.deposit_date && (
                <> · {format(parseISO(reservation.deposit_date), 'dd/MM/yyyy')}</>
              )}
              {' · '}Reste à payer : <strong>{fmt(total - deposit)}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                icon={<Download className="h-3.5 w-3.5" />}
                loading={loading === 'receipt-dl'}
                disabled={loading !== null}
                onClick={() => handleDocument('receipt', 'download')}
              >
                Télécharger
              </Button>
              <Button
                size="sm" variant="outline"
                icon={<Mail className="h-3.5 w-3.5" />}
                loading={loading === 'receipt-email'}
                disabled={loading !== null || !hasEmail}
                title={!hasEmail ? "Aucun email client renseigné" : undefined}
                onClick={() => handleDocument('receipt', 'email')}
              >
                Envoyer
              </Button>
            </div>
          </div>
        )}

        {/* ── Facture finale ── */}
        <div className="border border-brand-200 bg-brand-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-700 shrink-0" />
            <span className="text-sm font-semibold text-gray-800">Facture finale</span>
            {reservation.invoice_number && (
              <span className="ml-auto text-xs text-gray-400 font-mono">{reservation.invoice_number}</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Total : <strong>{fmt(total)}</strong>
            {deposit > 0 && deposit >= total && ' · '}
            {deposit > 0 && deposit >= total && <span className="text-green-700 font-medium">Soldé</span>}
            {deposit > 0 && deposit < total && (
              <> · Reste : <strong className="text-amber-700">{fmt(total - deposit)}</strong></>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              icon={<Download className="h-3.5 w-3.5" />}
              loading={loading === 'invoice-dl'}
              disabled={loading !== null}
              onClick={() => handleDocument('invoice', 'download')}
            >
              Télécharger
            </Button>
            <Button
              size="sm" variant="outline"
              icon={<Mail className="h-3.5 w-3.5" />}
              loading={loading === 'invoice-email'}
              disabled={loading !== null || !hasEmail}
              title={!hasEmail ? "Aucun email client renseigné" : undefined}
              onClick={() => handleDocument('invoice', 'email')}
            >
              Envoyer
            </Button>
          </div>
        </div>

        {!hasEmail && (
          <p className="text-xs text-amber-600">
            ⚠ Aucun email renseigné pour ce client — l'envoi par email n'est pas disponible.
          </p>
        )}
      </div>
    </Modal>
  )
}
