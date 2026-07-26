import { createClient } from 'jsr:@supabase/supabase-js@2'
import { emailWrap, infoBlock, frDate, type TenantBrand } from '../_shared/email.ts'

// Appelé chaque matin à 10h via pg_cron :
// SELECT cron.schedule('send-review-requests', '0 10 * * *', $$
//   SELECT net.http_post(
//     url     := 'https://<project>.supabase.co/functions/v1/send-review-request',
//     headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
//     body    := '{}'::jsonb
//   );
// $$);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SVC)
  const checkOutDate = yesterday()

  // Load all tenants at once (brand data + review link)
  const { data: tenants } = await sb
    .from('tenants')
    .select('id, name, logo_url, slogan, brand_color_primary, review_link')
  const tenantMap = Object.fromEntries(
    (tenants ?? []).map(t => [t.id, t])
  )

  const { data: reservations } = await sb
    .from('reservations')
    .select('id, check_in, check_out, tenant_id, villa:villas(name), client:clients(full_name, email)')
    .in('status', ['confirmed', 'checkout'])
    .eq('check_out', checkOutDate)
    .eq('review_sent', false)
    .not('client_id', 'is', null)

  const results: { id: string; sent: boolean; reason?: string }[] = []

  for (const r of (reservations ?? [])) {
    const clientEmail = (r.client as { email?: string } | null)?.email
    if (!clientEmail) { results.push({ id: r.id, sent: false, reason: 'no email' }); continue }

    const t = tenantMap[r.tenant_id]
    if (!t) { results.push({ id: r.id, sent: false, reason: 'tenant not found' }); continue }

    const brand: TenantBrand = {
      name:         t.name ?? 'Votre agence',
      logoUrl:      t.logo_url ?? null,
      slogan:       t.slogan ?? null,
      primaryColor: t.brand_color_primary ?? '#6B7C45',
    }
    const accent = brand.primaryColor

    const firstName = ((r.client as { full_name?: string } | null)?.full_name ?? 'Client').split(' ')[0]
    const villaName = (r.villa as { name?: string } | null)?.name ?? 'la villa'
    const stayHtml  = `<strong>Arrivée</strong> &middot; ${frDate(r.check_in)}<br/><strong>Départ</strong> &middot; ${frDate(r.check_out)}`

    const ctaBlock = t.review_link
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
           <tr>
             <td align="center">
               <a href="${t.review_link}" style="display:inline-block;padding:13px 30px;background:${accent};color:#FFFFFF;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;letter-spacing:0.04em">
                 Laisser un avis
               </a>
             </td>
           </tr>
         </table>`
      : ''

    const body = `
      <p style="margin:0 0 6px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:16px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 26px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
        On espère que votre séjour à <strong style="color:#0D1F2D">${villaName}</strong> s'est passé exactement comme vous l'espériez et que vous avez profité de chaque instant.
      </p>

      ${infoBlock('Votre séjour', stayHtml, accent)}

      <p style="margin:22px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
        ${t.review_link
          ? 'Votre avis nous est précieux. Si vous avez deux minutes, ça nous aide beaucoup à continuer à nous améliorer.'
          : 'Si vous avez des retours à nous faire &mdash; positifs ou à améliorer &mdash; n\'hésitez pas à nous écrire directement.'
        }
      </p>

      ${ctaBlock}

      <p style="margin:28px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.7">
        Merci pour votre confiance. On espère vous revoir bientôt.<br/>
        <strong style="color:#0D1F2D">L'équipe ${brand.name}</strong>
      </p>
    `

    const html = emailWrap(brand, `Comment s'est passé votre séjour ?`, null, body)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   [clientEmail],
        subject: `Comment s'est passé votre séjour à ${villaName} ?`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[send-review-request] Resend error for ${r.id}:`, err)
      results.push({ id: r.id, sent: false, reason: err })
      continue
    }

    await sb.from('reservations').update({ review_sent: true }).eq('id', r.id)
    results.push({ id: r.id, sent: true })
  }

  console.log('[send-review-request] done:', results)
  return new Response(JSON.stringify({ sent: results.filter(r => r.sent).length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
