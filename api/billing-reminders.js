// Vercel Cron — tous les jours à 8h UTC
// Relances automatiques pour les factures de commission (billing_records)
// impayées depuis plus de 30 jours (agences sans Stripe, encaissement manuel).
// Peut aussi être appelé manuellement : GET /api/billing-reminders?secret=CRON_SECRET
//
// Paliers, basés sur days_overdue = jours écoulés depuis l'échéance
// (sent_at + 30 jours) :
//   J+3   -> relance 1 (rappel amical) envoyée à l'agence
//   J+10  -> relance 2 (rappel plus ferme) envoyée à l'agence
//   J+20  -> relance 3 (dernier rappel avant restriction d'accès) envoyée à l'agence
//   J+30+ -> plus d'email à l'agence ; alerte interne à l'admin à la place,
//            répétée tous les 15 jours tant que la facture n'est pas soldée
//            ou annulée manuellement depuis /admin.

export const config = { maxDuration: 60 }

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_KEY        = process.env.RESEND_API_KEY
const CRON_SECRET       = process.env.CRON_SECRET
const FROM_EMAIL        = process.env.FROM_EMAIL ?? 'VillaHub Facturation <billing@agencykira.com>'
const ADMIN_ALERT_EMAIL = 'contact.agencykira@gmail.com'

const ADMIN_ESCALATION_INTERVAL_DAYS = 15

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: sbHeaders })
  if (!res.ok) {
    console.error('[billing-reminders] sbGet error', path, res.status, await res.text())
    return []
  }
  return res.json()
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[billing-reminders] sbPatch error', path, res.status, await res.text())
  }
  return res.ok
}

async function sendResendEmail({ to, subject, html }) {
  if (!RESEND_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })
    if (!res.ok) console.error('[billing-reminders] Resend error', res.status, await res.text())
    return res.ok
  } catch (e) {
    console.error('[billing-reminders] Resend fetch error:', e.message)
    return false
  }
}

const fmtAmt = (n, currency) =>
  `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

// ─── Emails de relance (paliers 1 à 3, envoyés à l'agence) ──────────────────
const TIER_COPY = {
  1: {
    banner: '#07BEB8',
    bannerLabel: 'Rappel',
    title: 'Petit rappel — facture en attente',
    body: (tenantName, periodLabel) => `
      <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${tenantName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7A85;line-height:1.7">
        Petit rappel : votre facture VillaHub pour <strong style="color:#0D1F2D">${periodLabel}</strong>
        est en attente de règlement. Si le virement a déjà été effectué, ignorez simplement cet email.
      </p>`,
  },
  2: {
    banner: '#E8A33D',
    bannerLabel: 'Deuxième rappel',
    title: 'Deuxième rappel — facture toujours en attente',
    body: (tenantName, periodLabel) => `
      <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${tenantName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7A85;line-height:1.7">
        Votre facture VillaHub pour <strong style="color:#0D1F2D">${periodLabel}</strong> n'a toujours pas
        été réglée. Merci de procéder au virement dès que possible, ou de nous écrire si vous rencontrez
        une difficulté — on trouve toujours une solution.
      </p>`,
  },
  3: {
    banner: '#D64545',
    bannerLabel: 'Dernier rappel',
    title: 'Dernier rappel avant restriction du compte',
    body: (tenantName, periodLabel) => `
      <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${tenantName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7A85;line-height:1.7">
        Votre facture VillaHub pour <strong style="color:#0D1F2D">${periodLabel}</strong> reste impayée
        depuis plus de 20 jours après son échéance. Sans règlement ou sans nouvelles de votre part sous
        peu, nous serons contraints de restreindre temporairement l'accès à votre compte. Contactez-nous
        à <strong>contact@villahub.io</strong> si besoin — on préfère toujours trouver un arrangement.
      </p>`,
  },
}

function buildReminderEmailHtml(tier, { tenantName, periodLabel, commissionAmount, invoiceNumber, currency }) {
  const copy = TIER_COPY[tier]
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0C447C;padding:28px 36px;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">VillaHub</h1>
      </td></tr>
      <tr><td style="background:${copy.banner};padding:10px 36px;text-align:center">
        <p style="margin:0;font-size:13px;font-weight:500;color:#fff">${copy.bannerLabel}</p>
      </td></tr>
      <tr><td style="padding:32px 36px">
        ${copy.body(tenantName, periodLabel)}
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px">
          <tr style="background:#F9FAFB">
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Période</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0D1F2D;text-align:right">${periodLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Montant dû</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0C447C;text-align:right">${fmtAmt(commissionAmount, currency)}</td>
          </tr>
          <tr style="background:#F9FAFB">
            <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Référence</td>
            <td style="padding:10px 16px;font-size:12px;font-family:monospace;color:#6B7A85;text-align:right">${invoiceNumber}</td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">
          Questions ? Écrivez-nous à <a href="mailto:contact@villahub.io" style="color:#0C447C">contact@villahub.io</a>
        </p>
      </td></tr>
      <tr><td style="background:#F5F0E8;padding:14px 36px;text-align:center;border-top:1px solid #EDE8DF">
        <p style="margin:0;font-size:11px;color:#9CA3AF">VillaHub · Plateforme de gestion locative</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Handler principal ────────────────────────────────────────────────────
async function runReminders(req, res) {
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const secret = bearerToken ?? req.headers['x-cron-secret'] ?? req.query.secret
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase config' })
  }

  const pending = await sbGet(
    '/billing_records?select=id,tenant_id,period,commission_amount,currency,invoice_number,sent_at,created_at,reminder_count,last_reminder_at&status=eq.pending'
  )
  if (!pending.length) {
    return res.status(200).json({ message: 'Aucune facture en attente', results: [] })
  }

  const tenantIds = [...new Set(pending.map(r => r.tenant_id))]
  const tenants   = await sbGet(`/tenants?select=id,name&id=in.(${tenantIds.join(',')})`)
  const tenantById = Object.fromEntries(tenants.map(t => [t.id, t.name]))

  const profiles = await sbGet(`/profiles?select=id,tenant_id&role=eq.admin&tenant_id=in.(${tenantIds.join(',')})`)
  const usersRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: sbHeaders })
  const { users = [] } = usersRes.ok ? await usersRes.json() : {}
  const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email]))
  const emailByTenant = {}
  for (const p of profiles) {
    if (emailByUserId[p.id]) emailByTenant[p.tenant_id] = emailByUserId[p.id]
  }

  const now = Date.now()
  const results = []
  const adminEscalations = []

  for (const record of pending) {
    const dueDate = new Date(record.sent_at ?? record.created_at)
    dueDate.setDate(dueDate.getDate() + 30)
    const daysOverdue = Math.floor((now - dueDate.getTime()) / 864e5)
    if (daysOverdue < 3) {
      results.push({ tenant: tenantById[record.tenant_id], status: 'not_yet_due', daysOverdue })
      continue
    }

    const tenantName = tenantById[record.tenant_id] ?? 'Agence'
    const periodLabel = new Date(
      Number(record.period.split('-')[0]),
      Number(record.period.split('-')[1]) - 1,
      1
    ).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    let targetTier = 0
    if (daysOverdue >= 20) targetTier = 3
    else if (daysOverdue >= 10) targetTier = 2
    else if (daysOverdue >= 3) targetTier = 1

    if (record.reminder_count < targetTier && targetTier <= 3) {
      const adminEmail = emailByTenant[record.tenant_id]
      if (!adminEmail) {
        results.push({ tenant: tenantName, status: 'error_no_email', daysOverdue })
        continue
      }
      const html = buildReminderEmailHtml(targetTier, {
        tenantName, periodLabel,
        commissionAmount: record.commission_amount,
        invoiceNumber: record.invoice_number,
        currency: record.currency,
      })
      const sent = await sendResendEmail({
        to: adminEmail,
        subject: `${TIER_COPY[targetTier].title} — VillaHub`,
        html,
      })
      if (sent) {
        await sbPatch(`/billing_records?id=eq.${record.id}`, {
          reminder_count: targetTier,
          last_reminder_at: new Date().toISOString(),
        })
        results.push({ tenant: tenantName, status: `reminder_${targetTier}_sent`, daysOverdue })
      } else {
        results.push({ tenant: tenantName, status: 'error_send_failed', daysOverdue })
      }
      continue
    }

    // Palier 3 déjà envoyé et toujours impayée 30j+ après échéance : on
    // n'embête plus l'agence, on prévient l'admin pour une décision manuelle
    // (relance personnalisée, arrangement, ou restriction du compte).
    if (daysOverdue >= 30 && record.reminder_count >= 3) {
      const lastAlert = record.last_reminder_at ? new Date(record.last_reminder_at).getTime() : 0
      const daysSinceLastAlert = (now - lastAlert) / 864e5
      if (daysSinceLastAlert >= ADMIN_ESCALATION_INTERVAL_DAYS) {
        adminEscalations.push(
          `${tenantName} — ${periodLabel} — ${fmtAmt(record.commission_amount, record.currency)} — ` +
          `${daysOverdue}j de retard — facture ${record.invoice_number}`
        )
        await sbPatch(`/billing_records?id=eq.${record.id}`, { last_reminder_at: new Date().toISOString() })
        results.push({ tenant: tenantName, status: 'admin_escalation', daysOverdue })
      } else {
        results.push({ tenant: tenantName, status: 'awaiting_manual_action', daysOverdue })
      }
    }
  }

  if (adminEscalations.length && RESEND_KEY) {
    await sendResendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject: `[VillaHub] ${adminEscalations.length} facture(s) impayée(s) depuis 30j+ — action requise`,
      html: `<div style="font-family:sans-serif;font-size:14px;color:#0D1F2D">
        <p><strong>Ces factures dépassent 30 jours de retard et ont déjà reçu les 3 relances automatiques.
        Une décision manuelle est nécessaire (relance personnalisée, arrangement, ou restriction du compte).</strong></p>
        <ul>${adminEscalations.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>`,
    })
  }

  return res.status(200).json({ processed: pending.length, results })
}

export default async function handler(req, res) {
  try {
    return await runReminders(req, res)
  } catch (e) {
    console.error('[billing-reminders] fatal error:', e)
    if (!res.headersSent) return res.status(500).json({ error: 'Internal error' })
  }
}
