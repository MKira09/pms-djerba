import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { reservation_id, doc_type, pdf_base64, filename } = await req.json() as {
    reservation_id: string
    doc_type: 'receipt' | 'invoice'
    pdf_base64: string
    filename: string
  }

  if (!reservation_id || !doc_type || !pdf_base64 || !filename) {
    return new Response('Missing required fields', { status: 400, headers: CORS })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: res, error } = await sb
    .from('reservations')
    .select('*, villa:villas(name, city), client:clients(full_name, email), tenant:tenants(name)')
    .eq('id', reservation_id)
    .single()

  if (error || !res) return new Response('Reservation not found', { status: 404, headers: CORS })

  const clientEmail = res.client?.email
  if (!clientEmail) return new Response('Client has no email', { status: 400, headers: CORS })

  const tenantName = res.tenant?.name ?? 'VillaHub'
  const villaName  = res.villa?.name ?? 'votre villa'
  const firstName  = (res.client?.full_name ?? 'Client').split(' ')[0]

  const isReceipt = doc_type === 'receipt'
  const subject   = isReceipt
    ? `Reçu d'acompte — ${villaName}`
    : `Facture — ${villaName}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:8px;overflow:hidden">

        <tr>
          <td style="background:#0C447C;padding:28px 36px;text-align:center">
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.5)">Géré avec</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;color:#FFFFFF">VillaHub</h1>
          </td>
        </tr>

        <tr>
          <td style="background:#07BEB8;padding:14px 36px;text-align:center">
            <p style="margin:0;font-size:15px;font-weight:500;color:#FFFFFF">
              ${isReceipt ? '✓ Votre reçu d\'acompte est disponible' : '✓ Votre facture est disponible'}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 36px">
            <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">
              Bonjour <strong>${firstName}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7A85;line-height:1.7">
              ${isReceipt
                ? `Veuillez trouver en pièce jointe votre reçu d'acompte pour votre séjour à <strong style="color:#0D1F2D">${villaName}</strong>.`
                : `Veuillez trouver en pièce jointe votre facture pour votre séjour à <strong style="color:#0D1F2D">${villaName}</strong>.`
              }
            </p>
            <p style="margin:0;font-size:14px;color:#6B7A85;line-height:1.7">
              Pour toute question, n'hésitez pas à nous contacter directement en répondant à cet email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#F5F0E8;padding:16px 36px;text-align:center;border-top:1px solid #EDE8DF">
            <p style="margin:0;font-size:11px;color:#9CA3AF">
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
      to: [clientEmail],
      reply_to: FROM_EMAIL,
      subject,
      html,
      attachments: [{ filename, content: pdf_base64 }],
    }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    console.error('[send-payment-doc] Resend error:', err)
    return new Response('Email send failed: ' + err, { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
