import { createClient } from 'jsr:@supabase/supabase-js@2'
import { emailWrap, infoBlock, codeBlock, contactsBlock, frDate, type TenantBrand, type Contact } from '../_shared/email.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

// Appelé chaque matin à 8h via pg_cron :
// SELECT cron.schedule('send-daily-reminders', '0 8 * * *', $$
//   SELECT net.http_post(url := '...', headers := '...', body := '{}');
// $$);

type Reservation = {
  id: string
  check_in: string
  check_out: string
  check_in_time: string | null
  check_out_time: string | null
  tenant_id: string
  villa: {
    name: string
    address: string | null
    city: string | null
    access_code: string | null
    arrival_info: string | null
    wifi_network: string | null
    wifi_password: string | null
    contact_numbers: Contact[] | null
  } | null
  client: { full_name: string | null; email: string | null } | null
}

type TenantData = {
  name: string | null
  logo_url: string | null
  slogan: string | null
  brand_color_primary: string | null
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10) }
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r
}

function buildEmail(days: 3 | 1, firstName: string, r: Reservation, brand: TenantBrand): { subject: string; html: string } {
  const accent       = brand.primaryColor
  const villaName    = r.villa?.name ?? 'la villa'
  const checkInDate  = frDate(r.check_in)
  const checkOutDate = frDate(r.check_out)
  const checkInTime  = r.check_in_time  ?? '15h00'
  const checkOutTime = r.check_out_time ?? '11h00'
  const address      = [r.villa?.address, r.villa?.city].filter(Boolean).join(', ')
  const contacts     = (r.villa?.contact_numbers ?? []) as Contact[]

  const datesHtml = `<strong>Arrivée</strong> &middot; ${checkInDate} à ${checkInTime}<br/><strong>Départ</strong> &middot; ${checkOutDate} à ${checkOutTime}`

  const wifiHtml = (r.villa?.wifi_network || r.villa?.wifi_password)
    ? [
        r.villa?.wifi_network  ? `<strong>Réseau</strong> &middot; ${r.villa.wifi_network}`       : '',
        r.villa?.wifi_password ? `<strong>Mot de passe</strong> &middot; ${r.villa.wifi_password}` : '',
      ].filter(Boolean).join('<br/>')
    : null

  const isJ1 = days === 1

  const intro = isJ1
    ? `C'est demain ! Votre arrivée à <strong style="color:#0D1F2D">${villaName}</strong> est dans moins de 24h. Voici tout ce qu'il vous faut.`
    : `Votre séjour à <strong style="color:#0D1F2D">${villaName}</strong> commence dans 3 jours. On vous prépare un petit rappel.`

  const subject = isJ1
    ? `C'est demain — vos infos d'arrivée pour ${villaName}`
    : `Plus que 3 jours avant ${villaName}`

  const banner = isJ1 ? 'À demain !' : 'Votre séjour approche'

  const body = `
    <p style="margin:0 0 6px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:16px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 28px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">${intro}</p>

    ${infoBlock('Votre séjour', datesHtml, accent)}
    ${address ? infoBlock('Adresse', address, accent) : ''}
    ${isJ1 && r.villa?.access_code ? codeBlock('Code d\'accès', r.villa.access_code, accent) : ''}
    ${isJ1 && wifiHtml ? infoBlock('WiFi', wifiHtml, accent) : ''}
    ${isJ1 && r.villa?.arrival_info ? infoBlock('Instructions d\'accès', `<span style="white-space:pre-line">${r.villa.arrival_info}</span>`, accent) : ''}
    ${contactsBlock(contacts, accent)}

    <p style="margin:26px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.7">
      ${isJ1
        ? 'Bon voyage, et à demain !'
        : 'Si vous avez des questions avant de venir, on est là.'
      }<br/>
      <strong style="color:#0D1F2D">${brand.name}</strong>
    </p>
  `

  return { subject, html: emailWrap(brand, subject, banner, body) }
}

Deno.serve(async () => {
  const sb    = createClient(SUPABASE_URL, SUPABASE_SVC)
  const today = new Date()
  const j3    = isoDate(addDays(today, 3))
  const j1    = isoDate(addDays(today, 1))

  const { data: tenants } = await sb
    .from('tenants')
    .select('id, name, logo_url, slogan, brand_color_primary')
  const tenantMap: Record<string, TenantData> = Object.fromEntries(
    (tenants ?? []).map(t => [t.id, { name: t.name, logo_url: t.logo_url, slogan: t.slogan, brand_color_primary: t.brand_color_primary }])
  )

  const [j3Res, j1Res] = await Promise.all([
    sb.from('reservations')
      .select('id, check_in, check_out, check_in_time, check_out_time, tenant_id, villa:villas(*), client:clients(full_name, email)')
      .eq('status', 'confirmed').eq('check_in', j3).eq('reminder_j3_sent', false).not('client_id', 'is', null),
    sb.from('reservations')
      .select('id, check_in, check_out, check_in_time, check_out_time, tenant_id, villa:villas(*), client:clients(full_name, email)')
      .eq('status', 'confirmed').eq('check_in', j1).eq('reminder_j1_sent', false).not('client_id', 'is', null),
  ])

  const results: { id: string; days: number; sent: boolean; reason?: string }[] = []

  async function sendReminder(r: Reservation, days: 3 | 1) {
    const email = r.client?.email
    if (!email) { results.push({ id: r.id, days, sent: false, reason: 'no email' }); return }

    const firstName = (r.client?.full_name ?? 'Client').split(' ')[0]
    const td        = tenantMap[r.tenant_id]
    const brand: TenantBrand = {
      name:         td?.name ?? 'Votre agence',
      logoUrl:      td?.logo_url ?? null,
      slogan:       td?.slogan ?? null,
      primaryColor: td?.brand_color_primary ?? '#6B7C45',
    }

    const { subject, html } = buildEmail(days, firstName, r, brand)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[send-reminders] J-${days} error for ${r.id}:`, err)
      results.push({ id: r.id, days, sent: false, reason: err })
      return
    }

    const flag = days === 3 ? 'reminder_j3_sent' : 'reminder_j1_sent'
    await sb.from('reservations').update({ [flag]: true }).eq('id', r.id)
    results.push({ id: r.id, days, sent: true })
    console.log(`[send-reminders] J-${days} sent to ${email} for ${r.id}`)
  }

  await Promise.all([
    ...(j3Res.data ?? []).map(r => sendReminder(r as unknown as Reservation, 3)),
    ...(j1Res.data ?? []).map(r => sendReminder(r as unknown as Reservation, 1)),
  ])

  console.log('[send-reminders] done:', results)
  return new Response(JSON.stringify({ sent: results.filter(r => r.sent).length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
