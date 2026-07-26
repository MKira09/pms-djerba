import { createClient } from 'jsr:@supabase/supabase-js@2'
import { emailWrap, infoBlock, codeBlock, contactsBlock, frDate, type TenantBrand, type Contact } from '../_shared/email.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { reservation_id } = await req.json()
  if (!reservation_id) return new Response('Missing reservation_id', { status: 400 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

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
    .select('name, logo_url, slogan, brand_color_primary, welcome_email_enabled')
    .eq('id', res.tenant_id)
    .single()

  if (tenant?.welcome_email_enabled === false) {
    return new Response('Welcome emails disabled for this tenant', { status: 200 })
  }

  const brand: TenantBrand = {
    name:         tenant?.name ?? 'Votre agence',
    logoUrl:      tenant?.logo_url ?? null,
    slogan:       tenant?.slogan ?? null,
    primaryColor: tenant?.brand_color_primary ?? '#6B7C45',
  }
  const accent = brand.primaryColor

  const firstName    = (client.full_name ?? 'Client').split(' ')[0]
  const checkOutDate = frDate(res.check_out)
  const checkInTime  = res.check_in_time  ?? '15h00'
  const checkOutTime = res.check_out_time ?? '11h00'
  const address      = [villa?.address, villa?.city].filter(Boolean).join(', ')
  const contacts     = (villa?.contact_numbers ?? []) as Contact[]

  const wifiHtml = (villa?.wifi_network || villa?.wifi_password)
    ? [
        villa?.wifi_network  ? `<strong>Réseau</strong> &middot; ${villa.wifi_network}`   : '',
        villa?.wifi_password ? `<strong>Mot de passe</strong> &middot; ${villa.wifi_password}` : '',
      ].filter(Boolean).join('<br/>')
    : null

  const body = `
    <p style="margin:0 0 6px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:16px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 28px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
      C'est le jour J ! Vous arrivez à <strong style="color:#0D1F2D">${villa?.name ?? 'la villa'}</strong> aujourd'hui à <strong style="color:#0D1F2D">${checkInTime}</strong>. La villa est prête pour vous.
    </p>

    ${address ? infoBlock('Adresse', address, accent) : ''}
    ${villa?.access_code ? codeBlock('Code d\'accès', villa.access_code, accent) : ''}
    ${wifiHtml ? infoBlock('WiFi', wifiHtml, accent) : ''}
    ${villa?.arrival_info ? infoBlock('Instructions d\'accès', `<span style="white-space:pre-line">${villa.arrival_info}</span>`, accent) : ''}
    ${contactsBlock(contacts, accent)}

    ${infoBlock('Votre départ', `${checkOutDate} à <strong>${checkOutTime}</strong>`, accent)}

    <p style="margin:26px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.7">
      <strong style="color:#0D1F2D">Excellente escapade !</strong>
    </p>
  `

  const html = emailWrap(brand, `Bienvenue à ${villa?.name ?? 'la villa'}`, 'Votre arrivée est aujourd\'hui', body)

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to:   [client.email],
      subject: `Bienvenue à ${villa?.name ?? 'la villa'} — tout ce qu'il faut savoir`,
      html,
    }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    console.error('[send-welcome-email] Resend error:', err)
    return new Response('Email send failed: ' + err, { status: 500 })
  }

  await sb.from('reservations').update({ updated_at: new Date().toISOString() }).eq('id', reservation_id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
