// Vercel Cron Job — runs daily at 7:00 AM UTC
// Sends: J-2 reminder, J+0 welcome, J+1 review request

const RESEND_KEY   = process.env.RESEND_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function offsetDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const [y, m, day] = dateStr.split('-')
  return `${day}/${m}/${y}`
}

async function fetchReservations(column, dateValue) {
  const url = `${SUPABASE_URL}/rest/v1/reservations?select=*,villa:villas(*),client:clients(*)` +
              `&${column}=eq.${dateValue}&status=neq.cancelled`
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
  })
  return res.ok ? res.json() : []
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY || !to) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'VillaHub <onboarding@resend.dev>', to: [to], subject, html }),
  })
}

function baseLayout(content) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e3a5f;padding:24px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">VillaHub</h1>
    </div>
    <div style="padding:32px;">${content}</div>
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Propulsé par <strong>VillaHub</strong></p>
    </div>
  </div></body></html>`
}

function reminderHtml(r) {
  return baseLayout(`
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;color:#1d4ed8;font-size:16px;font-weight:bold;">⏰ Votre arrivée dans 2 jours</p>
    </div>
    <p style="color:#374151;">Bonjour <strong>${r.client?.full_name || 'Client'}</strong>,</p>
    <p style="color:#374151;">Votre séjour à la villa <strong>${r.villa?.name}</strong> approche !</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;"><td style="padding:10px 14px;color:#6b7280;font-size:14px;">📅 Arrivée</td><td style="padding:10px 14px;font-weight:600;text-align:right;">${fmt(r.check_in)}${r.check_in_time ? ' à ' + r.check_in_time : ''}</td></tr>
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:14px;">📅 Départ</td><td style="padding:10px 14px;font-weight:600;text-align:right;">${fmt(r.check_out)}${r.check_out_time ? ' à ' + r.check_out_time : ''}</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:10px 14px;color:#6b7280;font-size:14px;">🏠 Villa</td><td style="padding:10px 14px;font-weight:600;text-align:right;">${r.villa?.name}</td></tr>
      ${r.villa?.address ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:14px;">📍 Adresse</td><td style="padding:10px 14px;text-align:right;">${r.villa.address}</td></tr>` : ''}
    </table>
    <p style="color:#374151;margin-top:20px;">À très bientôt !</p>`)
}

function welcomeHtml(r) {
  return baseLayout(`
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;color:#16a34a;font-size:16px;font-weight:bold;">🎉 Bienvenue à ${r.villa?.name} !</p>
    </div>
    <p style="color:#374151;">Bonjour <strong>${r.client?.full_name || 'Client'}</strong>,</p>
    <p style="color:#374151;">Nous vous souhaitons la bienvenue !</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${r.villa?.access_code ? `<tr style="background:#f9fafb;"><td style="padding:10px 14px;color:#6b7280;font-size:14px;">🔑 Code d'accès</td><td style="padding:10px 14px;font-weight:700;text-align:right;font-size:18px;color:#1e3a5f;">${r.villa.access_code}</td></tr>` : ''}
      ${r.villa?.wifi_password ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:14px;">📶 WiFi</td><td style="padding:10px 14px;font-weight:600;text-align:right;">${r.villa.wifi_password}</td></tr>` : ''}
      <tr style="background:#f9fafb;"><td style="padding:10px 14px;color:#6b7280;font-size:14px;">📅 Départ</td><td style="padding:10px 14px;font-weight:600;text-align:right;">${fmt(r.check_out)}${r.check_out_time ? ' à ' + r.check_out_time : ''}</td></tr>
    </table>
    ${r.villa?.arrival_info ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;margin-top:16px;"><p style="margin:0 0 6px;font-weight:600;color:#374151;">Instructions d'arrivée :</p><p style="margin:0;color:#6b7280;font-size:14px;white-space:pre-line;">${r.villa.arrival_info}</p></div>` : ''}
    <p style="color:#374151;margin-top:20px;">Bon séjour !</p>`)
}

function reviewHtml(r) {
  return baseLayout(`
    <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;color:#7e22ce;font-size:16px;font-weight:bold;">⭐ Comment s'est passé votre séjour ?</p>
    </div>
    <p style="color:#374151;">Bonjour <strong>${r.client?.full_name || 'Client'}</strong>,</p>
    <p style="color:#374151;">Nous espérons que votre séjour à la villa <strong>${r.villa?.name}</strong> s'est bien passé !</p>
    <p style="color:#374151;">Votre avis nous aide à améliorer nos services. Répondez directement à cet email avec votre note et vos commentaires.</p>
    <div style="text-align:center;margin:24px 0;font-size:32px;">⭐⭐⭐⭐⭐</div>
    <p style="color:#374151;">Merci de votre confiance !</p>`)
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase config' })
  }

  const in2Days   = offsetDate(2)
  const today     = offsetDate(0)
  const yesterday = offsetDate(-1)

  const [reminders, welcomes, reviews] = await Promise.all([
    fetchReservations('check_in', in2Days),
    fetchReservations('check_in', today),
    fetchReservations('check_out', yesterday),
  ])

  let sent = 0
  for (const r of reminders ?? []) {
    if (!r.client?.email) continue
    await sendEmail(r.client.email, `⏰ Rappel — Votre arrivée dans 2 jours à ${r.villa?.name}`, reminderHtml(r))
    sent++
  }
  for (const r of welcomes ?? []) {
    if (!r.client?.email) continue
    await sendEmail(r.client.email, `🎉 Bienvenue à ${r.villa?.name} !`, welcomeHtml(r))
    sent++
  }
  for (const r of reviews ?? []) {
    if (!r.client?.email) continue
    await sendEmail(r.client.email, `⭐ Comment s'est passé votre séjour à ${r.villa?.name} ?`, reviewHtml(r))
    sent++
  }

  return res.status(200).json({ ok: true, sent, reminders: reminders?.length, welcomes: welcomes?.length, reviews: reviews?.length })
}
