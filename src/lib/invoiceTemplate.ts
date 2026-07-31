import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import html2pdf from 'html2pdf.js'
import type { Reservation, Tenant } from '@/types'
import { fmtCurrency } from './utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return (s ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function frDate(iso: string): string {
  return format(parseISO(iso), 'dd MMMM yyyy', { locale: fr })
}

function makeFmt(r: Reservation, tenant: Tenant) {
  const base = tenant.currency ?? 'EUR'
  if (r.client_currency && r.client_currency_rate && r.client_currency !== base) {
    const cr   = r.client_currency
    const rate = r.client_currency_rate
    return (n: number) => fmtCurrency(Math.round(n * rate * 100) / 100, cr)
  }
  return (n: number) => fmtCurrency(n, base)
}

// ── Shared CSS (paramétré par les couleurs de marque) ──────────────────────

function sharedCss(olive: string, teal: string): string {
  return `
    *, *::before, *::after {
      box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    :root {
      --olive: ${olive};
      --teal:  ${teal};
      --sand:       #F5F0E8;
      --page-bg:    #FBF9F4;
      --text:       #3a3a30;
      --text-sec:   #5a5a4d;
      --text-muted: #8a8a6f;
      --serif: 'Playfair Display', Georgia, serif;
      --sans:  'Jost', 'Helvetica Neue', Arial, sans-serif;
    }
    @media screen {
      body { background: #ccc9c0; display: flex; justify-content: center; padding: 32px 20px; }
      .page { width: 210mm; min-height: 297mm; background: var(--page-bg); padding: 20mm 22mm; box-shadow: 0 10px 50px rgba(0,0,0,0.18); }
      .print-bar { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 1000; }
      .btn-print { padding: 9px 18px; background: var(--olive); color: #fff; border: none; border-radius: 6px; font-family: var(--sans); font-size: 13px; font-weight: 500; cursor: pointer; }
      .btn-close { padding: 9px 14px; background: rgba(0,0,0,0.12); color: var(--text); border: none; border-radius: 6px; font-family: var(--sans); font-size: 13px; cursor: pointer; }
    }
    @media print {
      body { background: none; padding: 0; }
      .page { padding: 0; box-shadow: none; background: var(--page-bg); }
      .print-bar { display: none !important; }
      @page { size: A4; margin: 20mm 22mm; }
    }
    body { font-family: var(--sans); color: var(--text); }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 7mm; }
    .brand-name { font-family: var(--serif); font-size: 36pt; font-weight: 700; color: var(--olive); line-height: 1; letter-spacing: -0.5px; }
    .brand-tagline { margin-top: 3px; font-family: var(--sans); font-size: 6.5pt; color: var(--teal); text-transform: uppercase; letter-spacing: 3.5px; }
    .doc-block { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .doc-title { font-family: var(--serif); font-size: 22pt; font-style: italic; font-weight: 400; color: var(--text); line-height: 1; }
    .doc-number { font-family: var(--sans); font-size: 7.5pt; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase; }
    .doc-date { font-family: var(--sans); font-size: 8pt; color: var(--text-sec); }
    .medallion { margin-top: 5px; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--teal); display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-size: 15pt; font-weight: 600; color: var(--teal); }

    /* Gradient rule */
    .grad-rule { height: 1px; background: linear-gradient(to right, var(--olive), var(--teal) 50%, var(--olive)); margin-bottom: 7mm; }

    /* Info 2-col */
    .info-grid { display: flex; gap: 12mm; margin-bottom: 6mm; }
    .info-col { flex: 1; }
    .col-label { font-family: var(--sans); font-size: 6pt; font-weight: 600; color: var(--teal); text-transform: uppercase; letter-spacing: 2.5px; padding-bottom: 2.5mm; border-bottom: 0.5pt solid var(--teal); margin-bottom: 3.5mm; }
    .col-name { font-family: var(--serif); font-size: 11pt; font-weight: 600; color: var(--text); margin-bottom: 2mm; }
    .col-detail { font-family: var(--sans); font-size: 8.5pt; color: var(--text-sec); line-height: 1.7; }
    .badge { display: inline-block; margin-top: 3mm; padding: 1mm 2.5mm; background: rgba(107,124,69,0.10); border-radius: 2px; font-family: var(--sans); font-size: 6.5pt; font-weight: 600; color: var(--olive); text-transform: uppercase; letter-spacing: 1px; }

    /* Stay banner */
    .stay-banner { display: flex; background: var(--sand); border-radius: 3px; margin-bottom: 7mm; overflow: hidden; }
    .stay-col { flex: 1; padding: 4mm 5mm; border-right: 0.5pt solid rgba(107,124,69,0.18); }
    .stay-col:last-child { border-right: none; }
    .stay-label { font-family: var(--sans); font-size: 5.5pt; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2mm; }
    .stay-value { font-family: var(--serif); font-size: 10pt; font-weight: 600; color: var(--olive); line-height: 1.2; }
    .stay-sub { margin-top: 1mm; font-family: var(--sans); font-size: 7pt; color: var(--text-muted); }

    /* Table */
    .table-wrap { margin-bottom: 5mm; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: var(--olive); }
    thead th { padding: 3mm; font-family: var(--sans); font-size: 6pt; font-weight: 600; color: #F0EDE4; text-transform: uppercase; letter-spacing: 2px; }
    thead th:first-child { text-align: left; padding-left: 4mm; }
    thead th:not(:first-child) { text-align: right; padding-right: 3mm; }
    tbody tr { border-bottom: 0.5pt solid var(--sand); }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 3.5mm 3mm; vertical-align: top; }
    tbody td:first-child { padding-left: 4mm; }
    tbody td:not(:first-child) { text-align: right; padding-right: 3mm; font-variant-numeric: tabular-nums; }
    .td-main { font-family: var(--serif); font-size: 9.5pt; color: var(--text); }
    .td-sub { margin-top: 1mm; font-family: var(--sans); font-size: 7pt; color: var(--text-muted); }
    .td-num { font-family: var(--sans); font-size: 9pt; color: var(--text-sec); }
    .td-total { font-family: var(--sans); font-size: 9pt; font-weight: 600; color: var(--text); }

    /* Total block */
    .total-wrap { display: flex; justify-content: flex-end; margin-bottom: 7mm; }
    .total-block { width: 78mm; }
    .total-row { display: flex; justify-content: space-between; align-items: baseline; padding: 2mm 0; border-bottom: 0.5pt solid var(--sand); }
    .total-row:last-of-type { border-bottom: none; }
    .t-label { font-family: var(--sans); font-size: 8.5pt; color: var(--text-sec); }
    .t-val { font-family: var(--sans); font-size: 9pt; color: var(--text); font-variant-numeric: tabular-nums; }
    .total-row-main { border-top: 1.5pt solid var(--olive); border-bottom: none; padding-top: 3.5mm; margin-top: 2mm; }
    .t-label-main { font-family: var(--serif); font-size: 14pt; font-weight: 600; color: var(--olive); }
    .t-val-main { font-family: var(--serif); font-size: 15pt; font-weight: 700; color: var(--olive); font-variant-numeric: tabular-nums; }

    /* Receipt payment section */
    .payment-section { margin-bottom: 7mm; }
    .payment-row { display: flex; justify-content: space-between; align-items: baseline; padding: 2.5mm 0; border-bottom: 0.5pt solid var(--sand); }
    .payment-row:last-of-type { border-bottom: none; }
    .pay-label { font-family: var(--sans); font-size: 9.5pt; color: var(--text-sec); }
    .pay-val { font-family: var(--sans); font-size: 10pt; color: var(--text); font-variant-numeric: tabular-nums; }
    .payment-row-main { border-top: 1.5pt solid var(--olive); border-bottom: none; padding-top: 4mm; margin-top: 2mm; }
    .pay-label-main { font-family: var(--serif); font-size: 14pt; font-weight: 600; color: var(--olive); }
    .pay-val-main { font-family: var(--serif); font-size: 15pt; font-weight: 700; color: var(--olive); font-variant-numeric: tabular-nums; }
    .payment-meta { margin-top: 4mm; font-family: var(--sans); font-size: 8pt; color: var(--text-muted); line-height: 1.8; }

    /* Encart */
    .encart { background: var(--sand); border-left: 3pt solid var(--teal); border-radius: 0 3px 3px 0; padding: 4mm 5mm; margin-bottom: 6mm; }
    .encart-label { font-family: var(--sans); font-size: 6pt; font-weight: 600; color: var(--teal); text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 2mm; }
    .encart-text { font-family: var(--sans); font-size: 7.5pt; color: var(--text-sec); line-height: 1.65; }

    /* Thank you */
    .thankyou { text-align: center; padding: 4mm 0 5mm; }
    .thankyou-msg { font-family: var(--serif); font-style: italic; font-size: 11.5pt; color: var(--text); margin-bottom: 2mm; }
    .thankyou-sub { font-family: var(--sans); font-size: 7.5pt; color: var(--text-muted); }

    /* Footer */
    .footer { border-top: 0.5pt solid #ddd8cc; padding-top: 4mm; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-family: var(--serif); font-size: 8pt; font-weight: 700; color: var(--olive); text-transform: uppercase; letter-spacing: 3px; }
    .footer-legal { font-family: var(--sans); font-size: 6.5pt; color: var(--text-muted); text-align: right; line-height: 1.6; }
  `
}

// ── Blocs HTML partagés ────────────────────────────────────────────────────

function headerHtml(tenant: Tenant, docTitle: string, docNumber: string): string {
  const initial  = (tenant.name ?? 'K').charAt(0).toUpperCase()
  const today    = format(new Date(), 'dd MMMM yyyy', { locale: fr })
  const tagline  = esc(tenant.slogan) || 'Location de villas de luxe'

  return `
  <header class="header">
    <div>
      <div class="brand-name">${esc(tenant.name)}</div>
      <div class="brand-tagline">${tagline}</div>
    </div>
    <div class="doc-block">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-number">N&deg;&nbsp;${esc(docNumber)}</div>
      <div class="doc-date">Émis le ${today}</div>
      <div class="medallion">${initial}</div>
    </div>
  </header>
  <div class="grad-rule"></div>`
}

function infoGridHtml(r: Reservation): string {
  const clientDetail = [r.client?.email, r.client?.phone].filter(Boolean).map(esc).join('<br />')
  const address      = [r.villa?.address, r.villa?.city].filter(Boolean).map(esc).join(', ')

  return `
  <div class="info-grid">
    <div class="info-col">
      <div class="col-label">Facturé à</div>
      <div class="col-name">${esc(r.client?.full_name)}</div>
      <div class="col-detail">${clientDetail || '—'}</div>
    </div>
    <div class="info-col">
      <div class="col-label">Réservation</div>
      <div class="col-name">${esc(r.villa?.name)}</div>
      <div class="col-detail">${address || '—'}<br />${r.guests} voyageur${r.guests > 1 ? 's' : ''}</div>
      <span class="badge">Confirmée</span>
    </div>
  </div>`
}

function stayBannerHtml(r: Reservation): string {
  const nights  = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
  const inTime  = r.check_in_time  ?? '16h00'
  const outTime = r.check_out_time ?? '11h00'
  const adults  = r.adults
  const children = r.children
  const paxDetail = (adults && children)
    ? `${adults} adulte${adults > 1 ? 's' : ''} · ${children} enfant${children > 1 ? 's' : ''}`
    : `${r.guests} pers.`

  return `
  <div class="stay-banner">
    <div class="stay-col">
      <div class="stay-label">Arrivée</div>
      <div class="stay-value">${frDate(r.check_in)}</div>
      <div class="stay-sub">à partir de ${inTime}</div>
    </div>
    <div class="stay-col">
      <div class="stay-label">Départ</div>
      <div class="stay-value">${frDate(r.check_out)}</div>
      <div class="stay-sub">avant ${outTime}</div>
    </div>
    <div class="stay-col">
      <div class="stay-label">Durée</div>
      <div class="stay-value">${nights} nuit${nights > 1 ? 's' : ''}</div>
      <div class="stay-sub">&nbsp;</div>
    </div>
    <div class="stay-col">
      <div class="stay-label">Voyageurs</div>
      <div class="stay-value">${r.guests} pers.</div>
      <div class="stay-sub">${paxDetail}</div>
    </div>
  </div>`
}

function encartHtml(tenant: Tenant): string {
  return `
  <div class="encart">
    <div class="encart-label">Informations</div>
    <div class="encart-text">
      Ce document est établi à titre informatif et ne constitue pas un contrat.
      La réservation est régie par les conditions générales de ${esc(tenant.name)}.
      Pour toute question, n'hésitez pas à nous contacter en répondant à cet email.
    </div>
  </div>`
}

function thankyouHtml(): string {
  return `
  <div class="thankyou">
    <div class="thankyou-msg">Merci de votre confiance &mdash; nous avons hâte de vous accueillir.</div>
  </div>`
}

function footerHtml(tenant: Tenant, docNumber: string): string {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr })
  return `
  <footer class="footer">
    <div class="footer-brand">${esc(tenant.name)}</div>
    <div class="footer-legal">
      Document non contractuel &middot; Établi le ${today}<br />
      Réf. ${esc(docNumber)}
    </div>
  </footer>`
}

function htmlShell(title: string, css: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
<div class="print-bar">
  <button class="btn-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  <button class="btn-close" onclick="window.close()">Fermer</button>
</div>
<div class="page">
${body}
</div>
<script>
  // Auto-print once Google Fonts are loaded
  document.fonts.ready.then(function() { window.print() })
</script>
</body>
</html>`
}

// ── Export : Facture ───────────────────────────────────────────────────────

export function buildInvoiceHtml(r: Reservation, tenant: Tenant, docNumber: string): string {
  const olive  = tenant.brand_color_primary  ?? '#6B7C45'
  const teal   = tenant.brand_color_secondary ?? '#4DB6AC'
  const fmt    = makeFmt(r, tenant)
  const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
  const extras = r.extras ?? []
  const extrasTotal = extras.reduce((s, e) => s + e.price * (e.quantity ?? 1), 0)
  const baseAmount  = r.total_amount - extrasTotal
  const perNight    = nights > 0 ? baseAmount / nights : baseAmount
  const deposit     = r.deposit_amount ?? 0

  const tableRows = [
    `<tr>
      <td>
        <div class="td-main">Séjour &mdash; ${esc(r.villa?.name)}</div>
        ${r.villa?.city ? `<div class="td-sub">${esc(r.villa.city)}</div>` : ''}
      </td>
      <td class="td-num">${fmt(Math.round(perNight))}&nbsp;/&nbsp;nuit</td>
      <td class="td-num">${nights}</td>
      <td class="td-total">${fmt(baseAmount)}</td>
    </tr>`,
    ...extras.map(e => `<tr>
      <td>
        <div class="td-main">${esc(e.name)}</div>
        ${e.description ? `<div class="td-sub">${esc(e.description)}</div>` : ''}
      </td>
      <td class="td-num">${fmt(e.price)}</td>
      <td class="td-num">${e.quantity ?? 1}</td>
      <td class="td-total">${fmt(e.price * (e.quantity ?? 1))}</td>
    </tr>`),
  ].join('')

  const depositRow = deposit > 0
    ? `<div class="total-row">
        <span class="t-label">Acompte versé</span>
        <span class="t-val">&ndash;&nbsp;${fmt(deposit)}</span>
       </div>`
    : ''

  const body = `
  ${headerHtml(tenant, 'Facture', docNumber)}
  ${infoGridHtml(r)}
  ${stayBannerHtml(r)}

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Prestation</th>
          <th>Prix&nbsp;/&nbsp;nuit</th>
          <th>Nuits</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="total-wrap">
    <div class="total-block">
      <div class="total-row">
        <span class="t-label">Sous-total</span>
        <span class="t-val">${fmt(r.total_amount)}</span>
      </div>
      ${depositRow}
      <div class="total-row total-row-main">
        <span class="t-label-main">${deposit > 0 ? 'Reste à payer' : 'Total'}</span>
        <span class="t-val-main">${fmt(deposit > 0 ? r.total_amount - deposit : r.total_amount)}</span>
      </div>
    </div>
  </div>

  ${encartHtml(tenant)}
  ${thankyouHtml()}
  ${footerHtml(tenant, docNumber)}`

  return htmlShell(
    `Facture ${docNumber} — ${tenant.name}`,
    sharedCss(olive, teal),
    body,
  )
}

// ── Export : Reçu d'acompte ────────────────────────────────────────────────

export function buildReceiptHtml(r: Reservation, tenant: Tenant, docNumber: string): string {
  const olive   = tenant.brand_color_primary  ?? '#6B7C45'
  const teal    = tenant.brand_color_secondary ?? '#4DB6AC'
  const fmt     = makeFmt(r, tenant)
  const deposit = r.deposit_amount ?? 0
  const remaining = r.total_amount - deposit

  const depositDateStr = r.deposit_date
    ? format(parseISO(r.deposit_date), 'dd MMMM yyyy', { locale: fr })
    : null

  const paymentMeta = [
    depositDateStr ? `Acompte reçu le ${depositDateStr}` : null,
    r.deposit_method ? `Mode de règlement : ${esc(r.deposit_method)}` : null,
  ].filter(Boolean).join('<br />')

  const body = `
  ${headerHtml(tenant, "Reçu d'acompte", docNumber)}
  ${infoGridHtml(r)}
  ${stayBannerHtml(r)}

  <div class="payment-section">
    <div class="payment-row">
      <span class="pay-label">Montant total du séjour</span>
      <span class="pay-val">${fmt(r.total_amount)}</span>
    </div>
    <div class="payment-row">
      <span class="pay-label">Acompte reçu</span>
      <span class="pay-val">&ndash;&nbsp;${fmt(deposit)}</span>
    </div>
    <div class="payment-row payment-row-main">
      <span class="pay-label-main">Reste à payer</span>
      <span class="pay-val-main">${fmt(remaining)}</span>
    </div>
    ${paymentMeta ? `<div class="payment-meta">${paymentMeta}</div>` : ''}
  </div>

  ${encartHtml(tenant)}
  ${thankyouHtml()}
  ${footerHtml(tenant, docNumber)}`

  return htmlShell(
    `Reçu d'acompte ${docNumber} — ${tenant.name}`,
    sharedCss(olive, teal),
    body,
  )
}

// ── Export : utilitaires ───────────────────────────────────────────────────

/** Rend le HTML de la facture dans un iframe hors-écran, prêt pour la capture html2canvas. */
async function renderInvoiceIframe(html: string): Promise<{ iframe: HTMLIFrameElement; page: HTMLElement | null }> {
  // Iframe hors-écran : isolation CSS totale (le CSS du template reset * margin/padding,
  // il ne faut pas qu'il s'applique au document principal de l'app)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:210mm',
    'min-height:297mm',
    'border:none',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(iframe)

  // Le HTML de la facture embarque un <script> qui déclenche window.print()
  // automatiquement (pensé pour l'ancien flux "ouvrir la page et imprimer").
  // Dans notre iframe hors-écran, ce script s'exécuterait quand même et
  // perturbe la capture html2canvas (le dialogue d'impression interfère avec
  // le rendu, ce qui produisait un PDF sans aucune mise en forme). On retire
  // tout <script> avant l'injection — on ne veut aucun effet de bord ici.
  const htmlForCapture = html.replace(/<script[\s\S]*?<\/script>/gi, '')

  const iDoc = iframe.contentDocument!
  iDoc.open()
  iDoc.write(htmlForCapture)
  iDoc.close()

  // Masquer la barre d'impression (visible uniquement en @media screen, mais
  // html2canvas capture en mode screen → elle apparaîtrait dans le PDF)
  const printBar = iDoc.querySelector<HTMLElement>('.print-bar')
  if (printBar) printBar.style.display = 'none'

  // Attendre que Google Fonts soit chargé dans l'iframe
  if (iframe.contentWindow?.document?.fonts) {
    await iframe.contentWindow.document.fonts.ready
  }
  // Buffer court pour que le rendu CSS se stabilise (gradients, shadows…)
  await new Promise<void>(r => setTimeout(r, 350))

  const page = iDoc.querySelector<HTMLElement>('.page')
  return { iframe, page }
}

function pdfOptions(filename: string) {
  return {
    margin:   0,
    filename,
    image:    { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale:           2,
      useCORS:         true,
      allowTaint:      false,
      logging:         false,
      backgroundColor: '#FBF9F4',
    },
    jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const },
  }
}

/** Télécharge directement le HTML en PDF via html2pdf.js (sans fenêtre intermédiaire). */
export async function downloadAsPdf(html: string, filename: string): Promise<void> {
  const { iframe, page } = await renderInvoiceIframe(html)
  try {
    if (!page) return
    await html2pdf().set(pdfOptions(filename)).from(page).save()
  } finally {
    document.body.removeChild(iframe)
  }
}

/**
 * Génère le PDF de la facture et le retourne en base64 (sans préfixe data URI),
 * pour l'envoyer en pièce jointe d'email (via Resend). On évite ainsi tout lien
 * cliquable vers Supabase Storage / Edge Functions, qui forcent text/plain sur
 * le HTML — un PDF en pièce jointe n'a pas ce problème et s'ouvre partout.
 */
export async function generateInvoicePdfBase64(html: string, filename: string): Promise<string | null> {
  const { iframe, page } = await renderInvoiceIframe(html)
  try {
    if (!page) return null
    const dataUri: string = await html2pdf().set(pdfOptions(filename)).from(page).outputPdf('datauristring')
    const base64 = dataUri.split(',')[1]
    return base64 ?? null
  } finally {
    document.body.removeChild(iframe)
  }
}

export function openPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'width=960,height=800')
  if (!win) {
    alert('Autorisez les popups pour télécharger le document.')
    return
  }
  win.document.write(html)
  win.document.close()
}
