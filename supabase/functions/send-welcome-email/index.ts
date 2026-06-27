import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL         = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  const { reservation_id } = await req.json()
  if (!reservation_id) return new Response('Missing reservation_id', { status: 400 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Fetch reservation + villa + client
  const { data: res, error } = await sb
    .from('reservations')
    .select('*, villa:villas(*), client:clients(*)')
    .eq('id', reservation_id)
    .single()

  if (error || !res) return new Response('Reservation not found', { status: 404 })

  const { villa, client } = res
  if (!client?.email) return new Response('Client has no email', { status: 400 })

  // Check if tenant has welcome emails enabled
  const { data: tenant } = await sb
    .from('tenants')
    .select('welcome_email_enabled, name')
    .eq('id', res.tenant_id)
    .single()

  if (tenant?.welcome_email_enabled === false) {
    return new Response('Welcome emails disabled for this tenant', { status: 200 })
  }

  // Format dates and times
  const checkInDate  = new Date(res.check_in).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkOutDate = new Date(res.check_out).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkInTime  = res.check_in_time  ?? '15:00'
  const checkOutTime = res.check_out_time ?? '11:00'

  const firstName = (client.full_name ?? 'Client').split(' ')[0]

  // Build contacts list
  const contacts: { name: string; role: string; phone: string }[] = villa?.contact_numbers ?? []
  const contactsHtml = contacts.length > 0
    ? contacts.map(c => `<li style="margin:4px 0"><strong>${c.name}</strong>${c.role ? ` — ${c.role}` : ''} : <a href="tel:${c.phone}" style="color:#07BEB8">${c.phone}</a></li>`).join('')
    : '<li style="color:#6B7A85">Aucun contact renseigné</li>'

  // Build HTML email
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Bienvenue à ${villa?.name ?? 'votre villa'}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#0C447C;padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6)">Géré avec</p>
            <h1 style="margin:6px 0 0;font-size:28px;font-weight:600;color:#FFFFFF;letter-spacing:0.04em">VillaHub</h1>
          </td>
        </tr>

        <!-- Welcome banner -->
        <tr>
          <td style="background:#07BEB8;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:18px;font-weight:500;color:#FFFFFF">
              Bienvenue à <strong>${villa?.name ?? 'votre villa'}</strong> ! 🏡
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">

            <p style="margin:0 0 24px;font-size:16px;color:#0D1F2D">
              Bonjour <strong>${firstName}</strong>,
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#4A6B70;line-height:1.7">
              Votre séjour commence <strong>aujourd'hui à ${checkInTime}</strong>.<br/>
              Le départ est prévu le <strong>${checkOutDate} à ${checkOutTime}</strong>.
            </p>

            <!-- Details cards -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">Adresse</p>
                  <p style="margin:0;font-size:15px;color:#0D1F2D">${villa?.address ?? ''}, ${villa?.city ?? ''}</p>
                </td>
              </tr>
            </table>

            ${villa?.access_code ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">Code d'accès</p>
                  <p style="margin:0;font-size:22px;font-weight:700;color:#0C447C;letter-spacing:0.08em">${villa.access_code}</p>
                </td>
              </tr>
            </table>` : ''}

            ${(villa?.wifi_network || villa?.wifi_password) ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📶 WiFi</p>
                  ${villa.wifi_network ? `<p style="margin:0 0 4px;font-size:14px;color:#4A6B70">Réseau : <strong style="color:#0D1F2D">${villa.wifi_network}</strong></p>` : ''}
                  ${villa.wifi_password ? `<p style="margin:0;font-size:14px;color:#4A6B70">Mot de passe : <strong style="color:#0D1F2D">${villa.wifi_password}</strong></p>` : ''}
                </td>
              </tr>
            </table>` : ''}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">📞 Personnes à contacter</p>
                  <ul style="margin:0;padding:0 0 0 16px;font-size:14px;color:#0D1F2D">${contactsHtml}</ul>
                </td>
              </tr>
            </table>

            ${villa?.arrival_info ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#07BEB8">🗝️ Instructions d'accès</p>
                  <p style="margin:0;font-size:14px;color:#0D1F2D;line-height:1.7;white-space:pre-line">${villa.arrival_info}</p>
                </td>
              </tr>
            </table>` : ''}

            <p style="margin:32px 0 0;font-size:16px;color:#0D1F2D;text-align:center">
              Bon séjour ! 🌊
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid #EDE8DF">
            <p style="margin:0;font-size:12px;color:#6B7A85">
              Géré par <strong>${tenant?.name ?? 'VillaHub'}</strong> · Propulsé par VillaHub
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  // Send via Resend
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to:   [client.email],
      subject: `Bienvenue à ${villa?.name ?? 'votre villa'} — Vos informations d'arrivée`,
      html,
    }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    console.error('Resend error:', err)
    return new Response('Email send failed: ' + err, { status: 500 })
  }

  // Log in DB
  await sb.from('reservations').update({ updated_at: new Date().toISOString() }).eq('id', reservation_id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
