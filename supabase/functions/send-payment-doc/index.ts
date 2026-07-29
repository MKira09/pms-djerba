import { createClient } from 'jsr:@supabase/supabase-js@2'
import { emailWrap, infoBlock, frDate, type TenantBrand } from '../_shared/email.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <noreply@villahub.io>'

    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY non configurée' }, 500)
    if (!SUPABASE_URL)   return json({ error: 'SUPABASE_URL non configurée' }, 500)
    if (!SUPABASE_SVC)   return json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée' }, 500)

    const body = await req.json()
    const { reservation_id, doc_type, doc_url } = body as {
      reservation_id: string
      doc_type: 'receipt' | 'invoice'
      doc_url: string | null
    }

    if (!reservation_id || !doc_type) {
      return json({ error: 'Champs requis manquants', received: Object.keys(body) }, 400)
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    const { data: res, error: resErr } = await sb
      .from('reservations')
      .select('*, villa:villas(name, city), client:clients(full_name, email), tenant:tenants(name, logo_url, slogan, brand_color_primary)')
      .eq('id', reservation_id)
      .single()

    if (resErr || !res) return json({ error: 'Réservation introuvable', detail: resErr?.message }, 404)

    const clientEmail = res.client?.email
    if (!clientEmail) return json({ error: 'Aucun email renseigné pour ce client' }, 400)

    const t = res.tenant as { name?: string; logo_url?: string; slogan?: string; brand_color_primary?: string } | null
    const brand: TenantBrand = {
      name:         t?.name ?? 'Votre agence',
      logoUrl:      t?.logo_url ?? null,
      slogan:       t?.slogan ?? null,
      primaryColor: t?.brand_color_primary ?? '#6B7C45',
    }
    const accent    = brand.primaryColor
    const isReceipt = doc_type === 'receipt'
    const villaName = res.villa?.name ?? 'la villa'
    const firstName = (res.client?.full_name ?? 'Client').split(' ')[0]

    const stayHtml = `<strong>Arrivée</strong> &middot; ${frDate(res.check_in)}<br/><strong>Départ</strong> &middot; ${frDate(res.check_out)}`

    const ctaBlock = doc_url
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
           <tr>
             <td align="center">
               <a href="${doc_url}" target="_blank"
                  style="display:inline-block;padding:13px 30px;background:${accent};color:#FFFFFF;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;letter-spacing:0.04em">
                 ${isReceipt ? "Voir mon reçu d'acompte" : 'Voir ma facture'}
               </a>
             </td>
           </tr>
         </table>
         <p style="margin:10px 0 0;text-align:center;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#8a9aaa">
           Le lien est valable 90 jours. Imprimez ou sauvegardez en PDF depuis votre navigateur.
         </p>`
      : `<p style="margin:20px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#5C6B77">
           Pour récupérer votre document, contactez-nous directement en répondant à cet email.
         </p>`

    const intro = isReceipt
      ? `Votre reçu d'acompte pour votre séjour à <strong style="color:#0D1F2D">${villaName}</strong> est disponible.`
      : `Votre facture pour votre séjour à <strong style="color:#0D1F2D">${villaName}</strong> est disponible.`

    const emailBody = `
      <p style="margin:0 0 6px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:16px;color:#0D1F2D">
        Bonjour <strong>${firstName}</strong>,
      </p>
      <p style="margin:0 0 24px;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.75">
        ${intro}
      </p>

      ${infoBlock('Votre séjour', stayHtml, accent)}

      ${ctaBlock}

      <p style="margin:28px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5C6B77;line-height:1.7">
        Pour toute question, répondez simplement à cet email.<br/>
        <strong style="color:#0D1F2D">L'équipe ${brand.name}</strong>
      </p>
    `

    const subject = isReceipt
      ? `Votre reçu d'acompte — ${villaName}`
      : `Votre facture — ${villaName}`

    const html = emailWrap(brand, subject, isReceipt ? "Reçu d'acompte" : 'Facture', emailBody)

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [clientEmail], reply_to: FROM_EMAIL, subject, html }),
    })

    if (!sendRes.ok) {
      const err = await sendRes.text()
      console.error('[send-payment-doc] Resend error:', err)
      return json({ error: 'Échec envoi email', detail: err }, 500)
    }

    return json({ ok: true })

  } catch (e) {
    console.error('[send-payment-doc] CRASH:', e)
    return json({ error: 'Erreur interne', detail: String(e) }, 500)
  }
})
