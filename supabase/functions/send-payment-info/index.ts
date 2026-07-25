import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FROM_EMAIL   = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'

    if (!SUPABASE_URL || !SUPABASE_SVC) return json({ error: 'Variables Supabase manquantes' }, 500)

    const { reservation_id, method, amount: reqAmount } = await req.json() as {
      reservation_id: string
      method: 'paypal' | 'virement'
      amount?: number
    }

    if (!reservation_id) return json({ error: 'reservation_id requis' }, 400)
    if (!method || !['paypal', 'virement'].includes(method)) return json({ error: 'method invalide (paypal ou virement)' }, 400)

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    const { data: res, error: resErr } = await sb
      .from('reservations')
      .select('*, villa:villas(name), client:clients(full_name, email), tenant:tenants(name, currency, paypal_me, bank_holder, bank_name, bank_iban, bank_bic)')
      .eq('id', reservation_id)
      .single()

    if (resErr || !res) return json({ error: 'Réservation introuvable' }, 404)
    if (!res.client?.email) return json({ error: 'Client sans email' }, 400)

    const t = res.tenant as {
      name: string | null
      currency: string | null
      paypal_me: string | null
      bank_holder: string | null
      bank_name: string | null
      bank_iban: string | null
      bank_bic: string | null
    }

    if (method === 'paypal' && !t.paypal_me) {
      return json({ error: 'Lien PayPal.me non configuré dans Paramètres → PayPal.' }, 400)
    }
    if (method === 'virement' && !t.bank_iban) {
      return json({ error: 'IBAN non configuré dans Paramètres → Virement bancaire.' }, 400)
    }

    const total     = Number(res.total_amount)
    const amount    = reqAmount && reqAmount > 0 && reqAmount <= total ? reqAmount : total
    const cur       = t.currency ?? 'TND'
    const villaName = res.villa?.name ?? 'votre villa'
    const firstName = (res.client.full_name ?? 'Client').split(' ')[0]
    const tenantName = t.name ?? 'VillaHub'
    const reference  = `Séjour ${villaName} – ${res.check_in}`

    let subject: string
    let html: string

    if (method === 'paypal') {
      subject = `Paiement PayPal — ${villaName}`
      const paypalUrl = t.paypal_me!

      html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0C447C;padding:28px 36px;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff">VillaHub</h1>
      </td></tr>
      <tr><td style="background:#003087;padding:12px 36px;text-align:center">
        <p style="margin:0;font-size:14px;font-weight:500;color:#fff">💳 Paiement via PayPal</p>
      </td></tr>
      <tr><td style="padding:32px 36px">
        <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 8px;font-size:14px;color:#6B7A85;line-height:1.7">
          Pour régler votre séjour à <strong style="color:#0D1F2D">${villaName}</strong>
          du <strong>${fmtDate(res.check_in)}</strong> au <strong>${fmtDate(res.check_out)}</strong>,
          veuillez nous envoyer le montant suivant via PayPal :
        </p>
        <p style="margin:16px 0;font-size:30px;font-weight:700;color:#003087;text-align:center">
          ${amount.toLocaleString('fr-TN')} ${cur}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 24px">
            <a href="${paypalUrl}" style="display:inline-block;background:#003087;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px">
              Payer via PayPal →
            </a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6B7A85">
          Merci d'indiquer la référence suivante dans le message PayPal :
        </p>
        <p style="margin:0;font-size:13px;color:#0D1F2D;background:#F5F0E8;padding:10px 14px;border-radius:6px;font-family:monospace">
          ${reference}
        </p>
      </td></tr>
      <tr><td style="background:#F5F0E8;padding:14px 36px;text-align:center;border-top:1px solid #EDE8DF">
        <p style="margin:0;font-size:11px;color:#9CA3AF">
          Géré par <strong>${tenantName}</strong> · Propulsé par VillaHub
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

    } else {
      subject = `Coordonnées bancaires — ${villaName}`

      const bankRows = [
        ['Titulaire', t.bank_holder],
        ['Banque', t.bank_name],
        ['IBAN', t.bank_iban],
        ['BIC / SWIFT', t.bank_bic],
      ].filter(([, v]) => v)

      const bankTable = bankRows.map(([label, value]) =>
        `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#6B7A85;white-space:nowrap;border-bottom:1px solid #EDE8DF">${label}</td>
          <td style="padding:10px 14px;font-size:13px;color:#0D1F2D;font-family:monospace;font-weight:600;border-bottom:1px solid #EDE8DF">${value}</td>
        </tr>`
      ).join('')

      html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0C447C;padding:28px 36px;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff">VillaHub</h1>
      </td></tr>
      <tr><td style="background:#07BEB8;padding:12px 36px;text-align:center">
        <p style="margin:0;font-size:14px;font-weight:500;color:#fff">🏦 Virement bancaire</p>
      </td></tr>
      <tr><td style="padding:32px 36px">
        <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#6B7A85;line-height:1.7">
          Pour régler votre séjour à <strong style="color:#0D1F2D">${villaName}</strong>
          du <strong>${fmtDate(res.check_in)}</strong> au <strong>${fmtDate(res.check_out)}</strong>,
          effectuez un virement du montant suivant :
        </p>
        <p style="margin:0 0 24px;font-size:30px;font-weight:700;color:#0C447C;text-align:center">
          ${amount.toLocaleString('fr-TN')} ${cur}
        </p>
        <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#0D1F2D">Coordonnées bancaires :</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE8DF;border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${bankTable}
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6B7A85">
          ⚠️ Merci d'indiquer la référence suivante dans votre virement :
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#0D1F2D;background:#F5F0E8;padding:10px 14px;border-radius:6px;font-family:monospace">
          ${reference}
        </p>
        <p style="margin:0;font-size:13px;color:#6B7A85;line-height:1.6">
          Nous vous confirmerons la réception du virement dès qu'il apparaîtra sur notre compte.
        </p>
      </td></tr>
      <tr><td style="background:#F5F0E8;padding:14px 36px;text-align:center;border-top:1px solid #EDE8DF">
        <p style="margin:0;font-size:11px;color:#9CA3AF">
          Géré par <strong>${tenantName}</strong> · Propulsé par VillaHub
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
    }

    // Send email first — only update DB if it succeeds (or if Resend not configured)
    if (RESEND_KEY) {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: [res.client.email], subject, html }),
      })
      const resendBody = await sendRes.text()
      console.log('[send-payment-info] Resend:', sendRes.status, resendBody.slice(0, 200))
      if (!sendRes.ok) {
        return json({ error: 'Erreur envoi email', detail: resendBody }, 500)
      }
    }

    await sb.from('reservations').update({
      payment_status: 'link_sent',
      stripe_amount: amount,
    }).eq('id', reservation_id)

    return json({ ok: true })

  } catch (e) {
    console.error('[send-payment-info] CRASH:', e)
    return json({ error: 'Erreur interne', detail: String(e) }, 500)
  }
})
