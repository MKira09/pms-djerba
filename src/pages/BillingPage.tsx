import { useEffect, useState } from 'react'
import { Receipt, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { downloadAsPdf } from '@/lib/invoiceTemplate'
import { fmtCurrency } from '@/lib/utils'

interface BillingRecord {
  id: string
  period: string
  ca_amount: number
  booking_count: number
  commission_rate: number
  commission_amount: number
  currency: string
  status: 'pending' | 'paid' | 'cancelled' | 'waived'
  invoice_number: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending:   { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  paid:      { label: 'Payée',      className: 'bg-success-100 text-success-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-700' },
  waived:    { label: 'Remise',    className: 'bg-blue-100 text-blue-700' },
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function buildBillingPdfHtml(record: BillingRecord, tenantName: string): string {
  const pct      = Math.round(record.commission_rate * 100)
  const period   = formatPeriod(record.period)
  const today    = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const due      = record.paid_at
    ? new Date(record.paid_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(Date.now() + 30 * 864e5).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmtAmt   = (n: number) => fmtCurrency(n, record.currency)
  const invNum   = record.invoice_number ?? '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:10pt}
.page{width:210mm;min-height:297mm;padding:18mm 22mm;background:#fff}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:7mm;border-bottom:2.5px solid #3D5A3E;margin-bottom:8mm}
.brand{font-size:26pt;font-weight:800;color:#3D5A3E;letter-spacing:-1px}
.brand-sub{font-size:7pt;color:#6B7A85;margin-top:1.5mm;letter-spacing:2.5px;text-transform:uppercase}
.doc-meta{text-align:right}
.doc-title{font-size:13pt;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px}
.doc-num{font-size:8.5pt;color:#6B7A85;margin-top:1.5mm}
.doc-date{font-size:8.5pt;color:#6B7A85;margin-top:1mm}
.parties{display:flex;gap:16mm;margin-bottom:8mm}
.party{flex:1}
.party-label{font-size:6.5pt;font-weight:700;color:#3D5A3E;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #3D5A3E;padding-bottom:2mm;margin-bottom:3mm}
.party-name{font-size:11pt;font-weight:700;color:#1a1a2e;margin-bottom:1mm}
.party-detail{font-size:8.5pt;color:#6B7A85;line-height:1.6}
table{width:100%;border-collapse:collapse;margin-bottom:6mm}
thead tr{background:#3D5A3E}
thead th{color:#fff;font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding:3mm 4mm;text-align:left}
thead th:last-child{text-align:right}
tbody td{padding:3.5mm 4mm;font-size:9.5pt;border-bottom:1px solid #f0f0f0;vertical-align:top}
tbody td:last-child{text-align:right;font-weight:600;white-space:nowrap}
.total-wrap{display:flex;justify-content:flex-end;margin-bottom:8mm}
.total-box{width:85mm;border-top:2px solid #3D5A3E;padding-top:3mm}
.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;font-size:10pt}
.total-final{font-size:13pt;font-weight:800;color:#3D5A3E}
.pay-box{background:#f0f4f8;border-radius:4px;padding:5mm;margin-bottom:6mm}
.pay-title{font-size:7pt;font-weight:700;color:#3D5A3E;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2mm}
.pay-detail{font-size:8.5pt;color:#1a1a2e;line-height:1.9}
.footer{border-top:1px solid #e0e0e0;padding-top:4mm;text-align:center;font-size:7.5pt;color:#9CA3AF}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div>
      <div class="brand">VillaHub</div>
      <div class="brand-sub">Plateforme de gestion locative</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">Facture</div>
      <div class="doc-num">N° ${invNum}</div>
      <div class="doc-date">Émise le ${today}</div>
      ${record.status === 'paid' ? `<div class="doc-date">Réglée le ${due}</div>` : `<div class="doc-date">Échéance : ${due}</div>`}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Émetteur</div>
      <div class="party-name">VillaHub</div>
      <div class="party-detail">Plateforme SaaS de gestion locative<br/>contact@villahub.io</div>
    </div>
    <div class="party">
      <div class="party-label">Facturé à</div>
      <div class="party-name">${tenantName}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Détail</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Commission plateforme — ${period}</td>
        <td style="color:#6B7A85;font-size:8.5pt">
          ${record.booking_count} réservation${record.booking_count > 1 ? 's' : ''}<br/>
          CA enregistré : ${fmtAmt(record.ca_amount)}<br/>
          Taux : ${pct}%
        </td>
        <td>${fmtAmt(record.commission_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-wrap">
    <div class="total-box">
      <div class="total-row total-final">
        <span>Total dû</span>
        <span>${fmtAmt(record.commission_amount)}</span>
      </div>
    </div>
  </div>

  <div class="pay-box">
    <div class="pay-title">Modalités de règlement</div>
    <div class="pay-detail">
      Virement bancaire · Délai : 30 jours · Référence : <strong>${invNum}</strong><br/>
      Questions : <strong>contact@villahub.io</strong>
    </div>
  </div>

  <div class="footer">
    VillaHub · Plateforme SaaS de gestion locative · contact@villahub.io · Ce document tient lieu de facture.
  </div>
</div>
</body>
</html>`
}

export default function BillingPage() {
  const { tenant } = useAuthStore()
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('billing_records')
      .select('*')
      .order('period', { ascending: false })
      .then(({ data }) => {
        setRecords((data as BillingRecord[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function handleDownload(record: BillingRecord) {
    setDownloading(record.id)
    try {
      const html = buildBillingPdfHtml(record, tenant?.name ?? 'Mon agence')
      await downloadAsPdf(html, `facture_villahub_${record.period}.pdf`)
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-brand-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes factures VillaHub</h1>
          <p className="text-sm text-gray-500">Commission mensuelle de 3 % sur votre chiffre d'affaires enregistré</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-brand-700 border-t-transparent animate-spin" />
        </div>
      ) : records.length === 0 ? (
        /* Empty state */
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Aucune facture pour l'instant</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Votre première facture sera générée automatiquement le 1er du mois suivant,
            dès que des réservations auront été enregistrées.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Période</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">N° Facture</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">CA enregistré</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">Commission (3 %)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => {
                const status = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.pending
                const currency = record.currency ?? 'EUR'
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900 capitalize">
                      {formatPeriod(record.period)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">
                      {record.invoice_number ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-700">
                      {fmtCurrency(record.ca_amount, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                      {fmtCurrency(record.commission_amount, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDownload(record)}
                        disabled={downloading === record.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-900 disabled:opacity-50 transition-colors"
                      >
                        {downloading === record.id ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-brand-700 border-t-transparent animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Télécharger
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
