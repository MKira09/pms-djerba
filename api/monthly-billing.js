// Vercel Cron — 1er du mois à 6h UTC
// Facture automatique (PDF par email) pour les agences sans Stripe — commission 3%
// Peut aussi être appelé manuellement : GET /api/monthly-billing?secret=CRON_SECRET[&period=2026-07]

export const config = { maxDuration: 60 }

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_KEY    = process.env.RESEND_API_KEY
const CRON_SECRET   = process.env.CRON_SECRET
const APP_URL       = process.env.APP_URL ?? 'https://agencykira.com'
const FROM_EMAIL    = process.env.FROM_EMAIL ?? 'VillaHub Facturation <billing@agencykira.com>'
const COMMISSION    = 0.03
const MIN_INVOICE   = 1  // euros — en-dessous on ne facture pas

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: sbHeaders })
  if (!res.ok) {
    console.error('[monthly-billing] sbGet error', path, res.status, await res.text())
    return []
  }
  return res.json()
}

async function sbPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  return res.ok
}

// ─── HTML du PDF facture VillaHub → agence ───────────────────────────────────
function buildBillingPdfHtml({ invoiceNumber, periodLabel, tenantName, tenantEmail,
                               bookingCount, caAmount, commissionAmount, currency }) {
  const pct     = Math.round(COMMISSION * 100)
  const today   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const due     = new Date(Date.now() + 30 * 864e5).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmtAmt  = (n) => `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:10pt}
.page{width:210mm;min-height:297mm;padding:18mm 22mm;background:#fff}
/* ── Header ── */
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:7mm;border-bottom:2.5px solid #0C447C;margin-bottom:8mm}
.brand{font-size:26pt;font-weight:800;color:#0C447C;letter-spacing:-1px}
.brand-sub{font-size:7pt;color:#6B7A85;margin-top:1.5mm;letter-spacing:2.5px;text-transform:uppercase}
.doc-meta{text-align:right}
.doc-title{font-size:13pt;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px}
.doc-num{font-size:8.5pt;color:#6B7A85;margin-top:1.5mm}
.doc-date{font-size:8.5pt;color:#6B7A85;margin-top:1mm}
/* ── Parties ── */
.parties{display:flex;gap:16mm;margin-bottom:8mm}
.party{flex:1}
.party-label{font-size:6.5pt;font-weight:700;color:#0C447C;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #0C447C;padding-bottom:2mm;margin-bottom:3mm}
.party-name{font-size:11pt;font-weight:700;color:#1a1a2e;margin-bottom:1mm}
.party-detail{font-size:8.5pt;color:#6B7A85;line-height:1.6}
/* ── Table ── */
table{width:100%;border-collapse:collapse;margin-bottom:6mm}
thead tr{background:#0C447C}
thead th{color:#fff;font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding:3mm 4mm;text-align:left}
thead th:last-child{text-align:right}
tbody td{padding:3.5mm 4mm;font-size:9.5pt;border-bottom:1px solid #f0f0f0;vertical-align:top}
tbody td:last-child{text-align:right;font-weight:600;white-space:nowrap}
/* ── Total ── */
.total-wrap{display:flex;justify-content:flex-end;margin-bottom:8mm}
.total-box{width:85mm;border-top:2px solid #0C447C;padding-top:3mm}
.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;font-size:10pt}
.total-final{font-size:13pt;font-weight:800;color:#0C447C}
/* ── Paiement ── */
.pay-box{background:#f0f4f8;border-radius:4px;padding:5mm;margin-bottom:6mm}
.pay-title{font-size:7pt;font-weight:700;color:#0C447C;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2mm}
.pay-detail{font-size:8.5pt;color:#1a1a2e;line-height:1.9}
/* ── Footer ── */
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
      <div class="doc-num">N° ${invoiceNumber}</div>
      <div class="doc-date">Émise le ${today}</div>
      <div class="doc-date">Échéance : ${due}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Émetteur</div>
      <div class="party-name">VillaHub</div>
      <div class="party-detail">
        Plateforme SaaS de gestion locative<br/>
        contact@villahub.io
      </div>
    </div>
    <div class="party">
      <div class="party-label">Facturé à</div>
      <div class="party-name">${tenantName}</div>
      <div class="party-detail">${tenantEmail}</div>
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
        <td>Commission plateforme — ${periodLabel}</td>
        <td style="color:#6B7A85;font-size:8.5pt">
          ${bookingCount} réservation${bookingCount > 1 ? 's' : ''}<br/>
          CA enregistré : ${fmtAmt(caAmount)}<br/>
          Taux : ${pct}%
        </td>
        <td>${fmtAmt(commissionAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-wrap">
    <div class="total-box">
      <div class="total-row total-final">
        <span>Total dû</span>
        <span>${fmtAmt(commissionAmount)}</span>
      </div>
    </div>
  </div>

  <div class="pay-box">
    <div class="pay-title">Modalités de règlement</div>
    <div class="pay-detail">
      Virement bancaire · Délai : 30 jours · Référence de virement : <strong>${invoiceNumber}</strong><br/>
      Pour toute question : <strong>contact@villahub.io</strong>
    </div>
  </div>

  <div class="footer">
    VillaHub · Plateforme SaaS de gestion locative · contact@villahub.io
    · Ce document tient lieu de facture.
  </div>
</div>
</body>
</html>`
}

// ─── Email d'accompagnement ───────────────────────────────────────────────────
function buildBillingEmailHtml({ tenantName, periodLabel, commissionAmount, invoiceNumber, currency }) {
  const fmtAmt = (n) => `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0C447C;padding:28px 36px;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">VillaHub</h1>
      </td></tr>
      <tr><td style="background:#07BEB8;padding:10px 36px;text-align:center">
        <p style="margin:0;font-size:13px;font-weight:500;color:#fff">Facturation mensuelle</p>
      </td></tr>
      <tr><td style="padding:32px 36px">
        <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">
          Bonjour <strong>${tenantName}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#6B7A85;line-height:1.7">
          Vous trouverez ci-joint votre facture VillaHub pour la période
          <strong style="color:#0D1F2D">${periodLabel}</strong>.
        </p>
        <!-- Résumé -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px">
          <tr style="background:#F9FAFB">
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Période</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0D1F2D;text-align:right">${periodLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Commission (3%)</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0C447C;text-align:right">${fmtAmt(commissionAmount)}</td>
          </tr>
          <tr style="background:#F9FAFB">
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Référence</td>
            <td style="padding:10px 16px;font-size:12px;font-family:monospace;color:#6B7A85;text-align:right">${invoiceNumber}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6B7A85;line-height:1.6">
          La facture PDF est jointe à cet email.<br/>
          Règlement par virement bancaire sous 30 jours —
          merci d'indiquer la référence <strong style="color:#0D1F2D">${invoiceNumber}</strong>.
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">
          Questions ? Écrivez-nous à <a href="mailto:contact@villahub.io" style="color:#0C447C">contact@villahub.io</a>
        </p>
      </td></tr>
      <tr><td style="background:#F5F0E8;padding:14px 36px;text-align:center;border-top:1px solid #EDE8DF">
        <p style="margin:0;font-size:11px;color:#9CA3AF">
          VillaHub · Plateforme de gestion locative
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Sécurité : Vercel envoie automatiquement "Authorization: Bearer <CRON_SECRET>"
  // pour les déclenchements cron programmés — on l'accepte en plus du header
  // custom / query param (utiles pour les tests manuels).
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const secret = bearerToken ?? req.headers['x-cron-secret'] ?? req.query.secret
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase config' })
  }

  // Période de facturation (défaut : mois précédent)
  const periodParam = req.query.period
  let year, month
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    ;[year, month] = periodParam.split('-').map(Number)
  } else {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    year  = d.getFullYear()
    month = d.getMonth() + 1
  }
  const period      = `${year}-${String(month).padStart(2, '0')}`
  const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const startDate   = `${period}-01`
  const endDate     = new Date(year, month, 1).toISOString().split('T')[0]  // 1er du mois suivant

  console.log(`[monthly-billing] période: ${period} (${startDate} → ${endDate})`)

  // 1. Agences sans Stripe
  const tenants = await sbGet('/tenants?select=id,name,currency&stripe_account_id=is.null')
  if (!tenants.length) {
    return res.status(200).json({ period, message: 'Aucune agence sans Stripe', results: [] })
  }
  console.log(`[monthly-billing] ${tenants.length} agences sans Stripe`)

  // 2. Admins de ces agences
  const tenantIds   = tenants.map(t => t.id).join(',')
  const profiles    = await sbGet(`/profiles?select=id,tenant_id&role=eq.admin&tenant_id=in.(${tenantIds})`)

  // 3. Emails via Supabase Admin Auth API
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: sbHeaders })
  const { users = [] } = usersRes.ok ? await usersRes.json() : {}
  const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email]))

  // Map tenant_id → email admin
  const emailByTenant = {}
  for (const p of profiles) {
    if (emailByUserId[p.id]) emailByTenant[p.tenant_id] = emailByUserId[p.id]
  }

  // 4. CA réservations du mois (hors annulées)
  const resPath = `/reservations?select=tenant_id,total_amount` +
    `&check_in=gte.${startDate}&check_in=lt.${endDate}` +
    `&status=neq.cancelled&tenant_id=in.(${tenantIds})`
  const reservations = await sbGet(resPath)

  const caByTenant = {}
  for (const r of reservations) {
    if (!caByTenant[r.tenant_id]) caByTenant[r.tenant_id] = { ca: 0, count: 0 }
    caByTenant[r.tenant_id].ca    += Number(r.total_amount) || 0
    caByTenant[r.tenant_id].count += 1
  }

  // 5. Traitement par agence
  const results = []

  for (const tenant of tenants) {
    const data = caByTenant[tenant.id]

    if (!data || data.ca <= 0) {
      results.push({ tenant: tenant.name, status: 'skipped_no_bookings' })
      continue
    }

    const commissionAmount = Math.round(data.ca * COMMISSION * 100) / 100
    if (commissionAmount < MIN_INVOICE) {
      results.push({ tenant: tenant.name, status: 'skipped_below_minimum', commission: commissionAmount })
      continue
    }

    const adminEmail = emailByTenant[tenant.id]
    if (!adminEmail) {
      results.push({ tenant: tenant.name, status: 'error_no_email' })
      continue
    }

    // Idempotence — pas de double facturation
    const existing = await sbGet(`/billing_records?tenant_id=eq.${tenant.id}&period=eq.${period}`)
    if (existing.length > 0) {
      results.push({ tenant: tenant.name, status: 'already_billed', period })
      continue
    }

    const invoiceNumber = `VH-${period}-${tenant.id.slice(0, 6).toUpperCase()}`
    const currency      = tenant.currency ?? 'EUR'

    // Génération PDF via Puppeteer serverless
    let pdfBase64 = null
    try {
      const pdfRes = await fetch(`${APP_URL}/api/generate-invoice-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: buildBillingPdfHtml({
            invoiceNumber, periodLabel, tenantName: tenant.name, tenantEmail: adminEmail,
            bookingCount: data.count, caAmount: data.ca, commissionAmount, currency,
          }),
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (pdfRes.ok) {
        const { pdf_base64 } = await pdfRes.json()
        pdfBase64 = pdf_base64
      } else {
        console.error('[monthly-billing] PDF error', pdfRes.status, await pdfRes.text())
      }
    } catch (e) {
      console.error('[monthly-billing] PDF fetch error:', e.message)
    }

    // Enregistrement DB (avant envoi email pour garder une trace même si email échoue)
    await sbPost('/billing_records', {
      tenant_id:         tenant.id,
      period,
      ca_amount:         data.ca,
      booking_count:     data.count,
      commission_rate:   COMMISSION,
      commission_amount: commissionAmount,
      currency,
      status:            'pending',
      invoice_number:    invoiceNumber,
      sent_at:           new Date().toISOString(),
    })

    // Envoi email avec PDF en pièce jointe
    if (RESEND_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to:   [adminEmail],
          subject: `Facture VillaHub — ${periodLabel}`,
          html: buildBillingEmailHtml({ tenantName: tenant.name, periodLabel, commissionAmount, invoiceNumber, currency }),
          ...(pdfBase64 ? {
            attachments: [{
              filename: `facture_villahub_${period}.pdf`,
              content:  pdfBase64,
            }],
          } : {}),
        }),
      })
      console.log('[monthly-billing] Resend:', adminEmail, emailRes.status)
    }

    results.push({
      tenant:    tenant.name,
      email:     adminEmail,
      ca:        data.ca,
      commission: commissionAmount,
      currency,
      invoice:   invoiceNumber,
      status:    'billed',
    })
  }

  const billed  = results.filter(r => r.status === 'billed').length
  const skipped = results.filter(r => r.status.startsWith('skipped')).length
  const errors  = results.filter(r => r.status.startsWith('error')).length

  console.log(`[monthly-billing] done — billed:${billed} skipped:${skipped} errors:${errors}`)
  return res.status(200).json({ period, billed, skipped, errors, results })
}
