import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    })
  }

  try {
    const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'
    const APP_URL          = Deno.env.get('APP_URL') ?? 'https://app.villahub.io'

    const { reservation_id } = await req.json()
    if (!reservation_id) return new Response('Missing reservation_id', { status: 400 })

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    // Fetch reservation with villa and client
    const { data: res, error: resErr } = await sb
      .from('reservations')
      .select('*, villa:villas(id,name,base_price), client:clients(full_name,email,phone)')
      .eq('id', reservation_id)
      .single()

    if (resErr || !res) {
      console.error('[notify-owner] reservation not found:', resErr)
      return new Response('Reservation not found', { status: 404 })
    }

    // Find the tenant admin profile to get their auth email
    const { data: adminProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('tenant_id', res.tenant_id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()

    if (!adminProfile) {
      console.error('[notify-owner] no admin profile found for tenant', res.tenant_id)
      return new Response('Owner not found', { status: 404 })
    }

    const { data: { user: ownerUser } } = await sb.auth.admin.getUserById(adminProfile.id)
    const ownerEmail = ownerUser?.email
    if (!ownerEmail) {
      console.error('[notify-owner] owner has no email')
      return new Response('Owner email not found', { status: 404 })
    }

    const { villa, client } = res
    const villaName  = villa?.name ?? 'la villa'
    const clientName = client?.full_name ?? 'Client'
    const clientPhone = client?.phone ?? ''
    const clientEmail = client?.email ?? ''

    const checkIn  = new Date(res.check_in)
    const checkOut = new Date(res.check_out)
    const nights   = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000)
    const basePrice = Number(villa?.base_price ?? 0)
    const estimated = basePrice > 0 && nights > 0 ? basePrice * nights : 0

    const fmtDate = (d: Date) =>
      d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const messageRow = res.message
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
          <tr>
            <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">💬 Message du client</p>
              <p style="margin:0;font-size:15px;color:#0D1F2D;line-height:1.6;font-style:italic">"${res.message}"</p>
            </td>
          </tr>
        </table>`
      : ''

    const estimatedRow = estimated > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
          <tr>
            <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">💰 Montant estimé</p>
              <p style="margin:0;font-size:15px;color:#0D1F2D">${basePrice} TND × ${nights} nuit${nights > 1 ? 's' : ''} = <strong>${estimated} TND</strong></p>
            </td>
          </tr>
        </table>`
      : ''

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nouvelle demande de réservation</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#1B3A4B;padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5)">VillaHub</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#FFFFFF">Nouvelle demande de réservation</h1>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#4DB6AC;padding:18px 40px;text-align:center">
            <p style="margin:0;font-size:17px;font-weight:500;color:#FFFFFF">
              📬 Une nouvelle demande vous attend sur <strong>${villaName}</strong>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">

            <p style="margin:0 0 28px;font-size:15px;color:#4A6B70;line-height:1.7">
              Un client vient de soumettre une demande de réservation via le formulaire en ligne.
              Voici les détails :
            </p>

            <!-- Client -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">👤 Client</p>
                  <p style="margin:0 0 4px;font-size:15px;color:#0D1F2D"><strong>${clientName}</strong></p>
                  ${clientPhone ? `<p style="margin:0 0 2px;font-size:14px;color:#4A6B70">📞 ${clientPhone}</p>` : ''}
                  ${clientEmail ? `<p style="margin:0;font-size:14px;color:#4A6B70">✉️ ${clientEmail}</p>` : ''}
                </td>
              </tr>
            </table>

            <!-- Dates -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
              <tr>
                <td style="background:#F5F0E8;border-radius:6px;padding:20px 24px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#739949">📅 Dates de séjour</p>
                  <p style="margin:0 0 4px;font-size:15px;color:#0D1F2D"><strong>Arrivée :</strong> ${fmtDate(checkIn)}</p>
                  <p style="margin:0 0 4px;font-size:15px;color:#0D1F2D"><strong>Départ :</strong> ${fmtDate(checkOut)}</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#6B7A85">${nights} nuit${nights > 1 ? 's' : ''}</p>
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

            ${estimatedRow}
            ${messageRow}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/reservations"
                     style="display:inline-block;background:#1B3A4B;color:#FFFFFF;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em">
                    Voir la demande dans VillaHub →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid #EDE8DF">
            <p style="margin:0;font-size:12px;color:#6B7A85">
              Propulsé par <strong>VillaHub</strong> · Cet email vous est envoyé en tant que propriétaire
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
        from:    FROM_EMAIL,
        to:      [ownerEmail],
        subject: `Nouvelle demande de réservation — ${villaName}`,
        html,
      }),
    })

    if (!sendRes.ok) {
      const err = await sendRes.text()
      console.error('[notify-owner] Resend error:', err)
      return new Response('Email send failed: ' + err, { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[notify-owner] unexpected error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
