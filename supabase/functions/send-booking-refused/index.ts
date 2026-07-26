import { createClient } from 'jsr:@supabase/supabase-js@2'
import { emailWrap, infoBlock, contactsBlock, frDate, type TenantBrand, type Contact } from '../_shared/email.ts'

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
    .select('name, logo_url, slogan, brand_color_primary')
    .eq('id', res.tenant_id)
    .single()

  const brand: TenantBrand = {
    name:         tenant?.name ?? 'Votre agence',
    logoUrl:      tenant?.logo_url ?? null,
    slogan:       tenant?.slogan ?? null,
    primaryColor: tenant?.brand_color_primary ?? '#6B7C45',
  }
  const accent = brand.primaryColor

  const firstName    = (client.full_name ?? 'Client').split(' ')[0]
  const checkInDate  = frDate(res.check_in)
  const checkOutDate = frDate(res.check_out)
  const contacts     = (villa?.contact_numbers ?? []) as Contact[]

  const datesHtml = `<strong>Arrivée</strong> &middot; ${checkInDate}<br/><strong>Départ</strong> &middot; ${checkOutDate}`

  const body = `
    <p style="margin:0 0 6px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:16px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
      Merci beaucoup de l'intérêt que vous portez à <strong style="color:#0D1F2D">${villa?.name ?? 'notre villa'}</strong>. Ces dates sont malheureusement déjà prises.
    </p>

    ${infoBlock('Dates demandées', datesHtml, accent)}

    <p style="margin:22px 0 24px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
      Si vous avez un peu de flexibilité sur les dates, contactez-nous directement &mdash; on fera de notre mieux pour trouver un créneau qui vous convient.
    </p>

    ${contactsBlock(contacts, accent)}

    <p style="margin:24px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.7">
      On espère quand même avoir l'occasion de vous accueillir.<br/>
      <strong style="color:#0D1F2D">L'équipe ${brand.name}</strong>
    </p>
  `

  const html = emailWrap(brand, 'Concernant votre demande', null, body)

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to:   [client.email],
      subject: `Concernant votre demande pour ${villa?.name ?? 'la villa'}`,
      html,
    }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    console.error('[send-booking-refused] Resend error:', err)
    return new Response('Email send failed: ' + err, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
