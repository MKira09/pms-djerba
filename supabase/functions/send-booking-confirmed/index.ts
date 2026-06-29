import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    })
  }

  const { reservation_id } = await req.json()
  if (!reservation_id) return new Response('Missing reservation_id', { status: 400 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: res, error } = await sb
    .from('reservations')
    .select('*, villa:villas(*), client:clients(*)')
    .eq('id', reservation_id)
    .single()

  if (error || !res) return new Response('Reservation not found', { status: 404 })

  const { villa, client } = res
  if (!client?.email) return new Response('Client has no email', { status: 400 })

  const { data: tenant } = await sb
    .from('tenants')
    .select('name')
    .eq('id', res.tenant_id)
    .single()

  const tenantName = tenant?.name ?? 'VillaHub'

  const checkInDate  = new Date(res.check_in).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkOutDate = new Date(res.check_out).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkInTime  = res.check_in_time ?? '15:00'

  const firstName = (client.full_name ?? 'Client').split(' ')[0]

  const contacts: { name: string; role: string; phone: string }[] = villa?.contact_numbers ?? []
  const contactsHtml = contacts.length > 0
    ? contacts.map(c => `<li style="margin:4px 0"><strong>${c.name}</strong>${c.role ? ` — ${c.role}` : ''} : <a href="tel:${c.phone}" style="color:#739949">${c.phone}</a></li>`).join('')
    : '<li style="color:#6B7A85">Contactez-nous pour toute question</li>'

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Réservation confirmée</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#7A8F58;padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6)">Géré par</p>
            <h1 style="margin:6px 0 0;font-size:28px;font-weight:600;color:#FFFFFF;letter-spacing:0.04em">${tenantName}</h1>
          </td>
        </tr>

        <!-- Confirmation banner -->
        <tr>
          <td style="background:#4DB6AC;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:18px;font-weight:500;color:#FFFFFF">
              Votre réservation est confirmée ! 🎉
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
              Bonne nouvelle ! Votre demande de réservation pour <strong>${villa?.name ?? 'la villa'}</strong> a été confirmée.<br/>
              Nous avons hâte de vous accueillir.
            </p>

            <!-- Dates -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">📅 Dates de séjour</p>
                  <p style="margin:0 0 4px;font-size:15px;color:#0D1F2D">
                    <strong>Arrivée :</strong> ${checkInDate} à partir de <strong>${checkInTime}</strong>
                  </p>
                  <p style="margin:0;font-size:15px;color:#0D1F2D">
                    <strong>Départ :</strong> ${checkOutDate}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Guests -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">👥 Voyageurs</p>
                  <p style="margin:0;font-size:15px;color:#0D1F2D">${res.guests ?? 1} personne${(res.guests ?? 1) > 1 ? 's' : ''}</p>
                </td>
              </tr>
            </table>

            <!-- Address -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">📍 Adresse</p>
                  <p style="margin:0;font-size:15px;color:#0D1F2D">${villa?.address ?? ''}${villa?.city ? ', ' + villa.city : ''}</p>
                </td>
              </tr>
            </table>

            <!-- Contacts -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">📞 Personnes à contacter</p>
                  <ul style="margin:0;padding:0 0 0 16px;font-size:14px;color:#0D1F2D">${contactsHtml}</ul>
                </td>
              </tr>
            </table>

            <p style="margin:32px 0 0;font-size:16px;color:#0D1F2D;text-align:center">
              À très bientôt ! 🌴
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid #EDE8DF">
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

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to:   [client.email],
      subject: `Votre réservation est confirmée ! 🎉 — ${villa?.name ?? 'VillaHub'}`,
      html,
    }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    console.error('Resend error:', err)
    return new Response('Email send failed: ' + err, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
