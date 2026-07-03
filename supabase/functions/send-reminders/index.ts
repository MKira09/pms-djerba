import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'

// Appelé chaque matin à 8h via pg_cron :
// SELECT cron.schedule('send-daily-reminders', '0 8 * * *', $$
//   SELECT net.http_post(
//     url     := 'https://<project>.supabase.co/functions/v1/send-reminders',
//     headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
//     body    := '{}'::jsonb
//   );
// $$);

type Res = {
  id: string
  check_in: string
  check_out: string
  check_in_time: string | null
  check_out_time: string | null
  tenant_id: string
  villa: {
    name: string
    address: string | null
    city: string
    access_code: string | null
    arrival_info: string | null
    wifi_network: string | null
    wifi_password: string | null
    contact_numbers: { name: string; role: string; phone: string }[] | null
  } | null
  client: {
    full_name: string | null
    email: string | null
  } | null
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function buildEmail(
  days: 3 | 1,
  firstName: string,
  r: Res,
  tenantName: string,
): string {
  const villaName   = r.villa?.name ?? 'votre villa'
  const checkInDate = frDate(r.check_in)
  const checkInTime = r.check_in_time ?? '15:00'
  const checkOutDate = frDate(r.check_out)
  const checkOutTime = r.check_out_time ?? '11:00'
  const address     = [r.villa?.address, r.villa?.city].filter(Boolean).join(', ')

  const contacts = r.villa?.contact_numbers ?? []
  const contactsHtml = contacts.length > 0
    ? contacts.map(c =>
        `<li style="margin:4px 0"><strong>${c.name}</strong>${c.role ? ` — ${c.role}` : ''} :
        <a href="tel:${c.phone}" style="color:#07BEB8">${c.phone}</a></li>`,
      ).join('')
    : '<li style="color:#6B7A85">Aucun contact renseigné</li>'

  const headerBg  = days === 3 ? '#0C447C' : '#07BEB8'
  const bannerBg  = days === 3 ? '#07BEB8' : '#0C447C'
  const subject   = days === 3
    ? `Votre arrivée dans 3 jours — ${villaName}`
    : `Votre arrivée demain — ${villaName}`
  const intro     = days === 3
    ? `Votre séjour à <strong>${villaName}</strong> commence dans <strong>3 jours</strong>.`
    : `Votre séjour à <strong>${villaName}</strong> commence <strong>demain</strong> ! 🎉`

  const accessBlock = r.villa?.access_code ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">🗝️ Code d'accès</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#0C447C;letter-spacing:0.08em">${r.villa.access_code}</p>
      </td>
    </tr>
  </table>` : ''

  const arrivalBlock = r.villa?.arrival_info ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📋 Instructions d'accès</p>
        <p style="margin:0;font-size:14px;color:#0D1F2D;line-height:1.7;white-space:pre-line">${r.villa.arrival_info}</p>
      </td>
    </tr>
  </table>` : ''

  const wifiBlock = (r.villa?.wifi_network || r.villa?.wifi_password) ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📶 WiFi</p>
        ${r.villa?.wifi_network ? `<p style="margin:0 0 4px;font-size:14px;color:#4A6B70">Réseau : <strong style="color:#0D1F2D">${r.villa.wifi_network}</strong></p>` : ''}
        ${r.villa?.wifi_password ? `<p style="margin:0;font-size:14px;color:#4A6B70">Mot de passe : <strong style="color:#0D1F2D">${r.villa.wifi_password}</strong></p>` : ''}
      </td>
    </tr>
  </table>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <tr>
          <td style="background:${headerBg};padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6)">Géré avec</p>
            <h1 style="margin:6px 0 0;font-size:26px;font-weight:600;color:#FFFFFF;letter-spacing:0.04em">VillaHub</h1>
          </td>
        </tr>

        <tr>
          <td style="background:${bannerBg};padding:18px 40px;text-align:center">
            <p style="margin:0;font-size:17px;font-weight:500;color:#FFFFFF">${intro}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px">

            <p style="margin:0 0 20px;font-size:16px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>

            <!-- Récap dates -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📅 Votre séjour</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#0D1F2D">
                    <strong>Arrivée :</strong> ${checkInDate} à <strong>${checkInTime}</strong>
                  </p>
                  <p style="margin:0;font-size:14px;color:#0D1F2D">
                    <strong>Départ :</strong> ${checkOutDate} à <strong>${checkOutTime}</strong>
                  </p>
                </td>
              </tr>
            </table>

            <!-- Adresse -->
            ${address ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📍 Adresse</p>
                  <p style="margin:0;font-size:15px;color:#0D1F2D">${address}</p>
                </td>
              </tr>
            </table>` : ''}

            ${accessBlock}
            ${wifiBlock}
            ${arrivalBlock}

            <!-- Contacts -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:18px 24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📞 Contacts</p>
                  <ul style="margin:0;padding:0 0 0 16px;font-size:14px;color:#0D1F2D">${contactsHtml}</ul>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:15px;color:#4A6B70;text-align:center;line-height:1.6">
              À très bientôt ! 🌞<br/>
              <strong style="color:#0D1F2D">${tenantName}</strong>
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#F5F0E8;padding:18px 40px;text-align:center;border-top:1px solid #EDE8DF">
            <p style="margin:0;font-size:12px;color:#6B7A85">
              Géré par <strong>${tenantName}</strong> · Propulsé par VillaHub
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  // Store subject in a way we can extract it
  void subject
}

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const today = new Date()
  const j3Date = isoDate(addDays(today, 3))
  const j1Date = isoDate(addDays(today, 1))

  // Load tenants once for name lookup
  const { data: tenants } = await sb.from('tenants').select('id, name')
  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t.name as string]))

  // Fetch J-3 and J-1 candidates in parallel
  const [j3Res, j1Res] = await Promise.all([
    sb.from('reservations')
      .select('id, check_in, check_out, check_in_time, check_out_time, tenant_id, villa:villas(*), client:clients(full_name, email)')
      .eq('status', 'confirmed')
      .eq('check_in', j3Date)
      .eq('reminder_j3_sent', false)
      .not('client_id', 'is', null),
    sb.from('reservations')
      .select('id, check_in, check_out, check_in_time, check_out_time, tenant_id, villa:villas(*), client:clients(full_name, email)')
      .eq('status', 'confirmed')
      .eq('check_in', j1Date)
      .eq('reminder_j1_sent', false)
      .not('client_id', 'is', null),
  ])

  const results: { id: string; days: number; sent: boolean; reason?: string }[] = []

  async function sendReminder(r: Res, days: 3 | 1) {
    const email = r.client?.email
    if (!email) { results.push({ id: r.id, days, sent: false, reason: 'no client email' }); return }

    const firstName = (r.client?.full_name ?? 'Client').split(' ')[0]
    const tenantName = tenantMap[r.tenant_id] ?? 'VillaHub'
    const villaName  = r.villa?.name ?? 'votre villa'

    const subject = days === 3
      ? `Votre arrivée dans 3 jours — ${villaName}`
      : `Votre arrivée demain — ${villaName}`

    const html = buildEmail(days, firstName, r, tenantName)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[send-reminders] J-${days} Resend error for ${r.id}:`, err)
      results.push({ id: r.id, days, sent: false, reason: err })
      return
    }

    // Mark as sent
    const flag = days === 3 ? 'reminder_j3_sent' : 'reminder_j1_sent'
    await sb.from('reservations').update({ [flag]: true }).eq('id', r.id)
    results.push({ id: r.id, days, sent: true })
    console.log(`[send-reminders] J-${days} sent to ${email} for reservation ${r.id}`)
  }

  const tasks = [
    ...(j3Res.data ?? []).map(r => sendReminder(r as unknown as Res, 3)),
    ...(j1Res.data ?? []).map(r => sendReminder(r as unknown as Res, 1)),
  ]
  await Promise.all(tasks)

  console.log('[send-reminders] done:', results)
  return new Response(JSON.stringify({ sent: results.filter(r => r.sent).length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
