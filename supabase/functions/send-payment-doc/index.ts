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

// Limite Resend : 40MB par email (toutes pièces jointes comprises). Une facture
// A4 en PDF fait quelques centaines de Ko — grosse marge de sécurité à 15MB.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

function base64SizeInBytes(b64: string): number {
  const clean = b64.replace(/=+$/, '')
  return Math.floor((clean.length * 3) / 4)
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
    // Le PDF est généré côté client (html2pdf.js) et envoyé en base64, pour être
    // joint directement à l'email — pas de lien à cliquer, pas de page à héberger.
    // (Anciennement : lien vers Supabase Storage/Edge Function, qui forcent toutes
    // les deux Content-Type: text/plain sur le HTML servi depuis *.supabase.co —
    // ce qui cassait l'affichage côté client. Le PDF en pièce jointe évite tout ça.)
    const { reservation_id, doc_type, pdf_base64, pdf_filename } = body as {
      reservation_id: string
      doc_type: 'receipt' | 'invoice'
      pdf_base64?: string | null
      pdf_filename?: string | null
    }

    console.log(
      '[send-payment-doc] body keys:', Object.keys(body),
      '| has pdf_base64:', !!pdf_base64,
      '| pdf_filename:', pdf_filename,
    )

    if (!reservation_id || !doc_type) {
      return json({ error: 'Champs requis manquants', received: Object.keys(body) }, 400)
    }

    let attachment: { filename: string; content: string } | null = null
    if (pdf_base64) {
      const size = base64SizeInBytes(pdf_base64)
      if (size > MAX_ATTACHMENT_BYTES) {
        return json({ error: `PDF trop volumineux (${(size / 1024 / 1024).toFixed(1)}MB, max 15MB)` }, 413)
      }
      attachment = { filename: pdf_filename ?? 'document.pdf', content: pdf_base64 }
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

    const ctaBlock = attachment
      ? `<p style="margin:20px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#5C6B77;text-align:center">
           📎 ${isReceipt ? 'Votre reçu' : 'Votre facture'} est jointe à cet email au format PDF.
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
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [clientEmail],
        reply_to: FROM_EMAIL,
        subject,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
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
