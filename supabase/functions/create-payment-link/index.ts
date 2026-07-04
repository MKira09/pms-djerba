import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Devises supportées par Stripe (TND non supporté — défaut EUR)
const STRIPE_CURRENCIES = new Set(['eur', 'usd', 'gbp', 'chf', 'mad', 'dkk', 'sek', 'nok', 'pln'])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const STRIPE_KEY   = Deno.env.get('STRIPE_SECRET_KEY')
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FROM_EMAIL   = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'
    const APP_URL      = Deno.env.get('APP_URL')    ?? 'https://app.villahub.io'

    console.log('[create-payment-link] env:', { hasStripe: !!STRIPE_KEY, hasResend: !!RESEND_KEY })

    if (!STRIPE_KEY)   return json({ error: 'STRIPE_SECRET_KEY non configurée dans les secrets Supabase' }, 500)
    if (!SUPABASE_URL || !SUPABASE_SVC) return json({ error: 'Variables Supabase manquantes' }, 500)

    const { reservation_id, amount: reqAmount } = await req.json() as { reservation_id: string; amount?: number }
    if (!reservation_id) return json({ error: 'reservation_id requis' }, 400)

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    const { data: res, error: resErr } = await sb
      .from('reservations')
      .select('*, villa:villas(name), client:clients(full_name, email), tenant:tenants(name, currency)')
      .eq('id', reservation_id)
      .single()

    console.log('[create-payment-link] reservation:', { found: !!res, error: resErr?.message })

    if (resErr || !res) return json({ error: 'Réservation introuvable' }, 404)
    if (!res.client?.email) return json({ error: 'Client sans email — impossible d\'envoyer le lien' }, 400)

    const total = Number(res.total_amount)
    // Use caller-specified amount if valid; otherwise fall back to full total
    const amountDue = reqAmount && reqAmount > 0 && reqAmount <= total ? reqAmount : total

    // Devise Stripe — TND non supporté, utilise EUR par défaut
    const tenantCurrency = (res.tenant?.currency ?? 'eur').toLowerCase()
    const stripeCurrency = STRIPE_CURRENCIES.has(tenantCurrency) ? tenantCurrency : 'eur'

    console.log('[create-payment-link] Stripe:', { amountDue, tenantCurrency, stripeCurrency })

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name:        `Séjour – ${res.villa?.name ?? 'Villa'}`,
            description: `${res.check_in} → ${res.check_out} · ${res.guests} pers.`,
          },
          unit_amount: Math.round(amountDue * 100), // centimes
        },
        quantity: 1,
      }],
      mode:           'payment',
      customer_email: res.client.email,
      expires_at:     Math.floor(Date.now() / 1000) + 86400, // 24h
      success_url:    `${APP_URL}/booking/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:     `${APP_URL}/booking/payment-cancel`,
      metadata:       { reservation_id },
    })

    console.log('[create-payment-link] session:', session.id, session.url?.slice(0, 60))

    // Mise à jour en base
    await sb.from('reservations').update({
      payment_status:       'link_sent',
      stripe_payment_link:  session.url,
      stripe_amount:        amountDue,
    }).eq('id', reservation_id)

    // Email avec le lien
    if (RESEND_KEY && session.url) {
      const villaName   = res.villa?.name  ?? 'votre villa'
      const firstName   = (res.client.full_name ?? 'Client').split(' ')[0]
      const tenantName  = res.tenant?.name ?? 'VillaHub'
      const subject     = `Lien de paiement — ${villaName}`

      const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0C447C;padding:28px 36px;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff">VillaHub</h1>
      </td></tr>
      <tr><td style="background:#07BEB8;padding:12px 36px;text-align:center">
        <p style="margin:0;font-size:14px;font-weight:500;color:#fff">💳 Lien de paiement sécurisé</p>
      </td></tr>
      <tr><td style="padding:32px 36px">
        <p style="margin:0 0 16px;font-size:15px;color:#0D1F2D">Bonjour <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;color:#6B7A85;line-height:1.7">
          Voici votre lien sécurisé pour régler votre séjour à
          <strong style="color:#0D1F2D">${villaName}</strong>.
          Ce lien est valable <strong>24 heures</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 24px">
            <a href="${session.url}" style="display:inline-block;background:#0C447C;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px">
              Payer maintenant →
            </a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:11px;color:#9CA3AF;word-break:break-all">
          Lien : ${session.url}
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

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: [res.client.email], subject, html }),
      })

      const resendBody = await sendRes.text()
      console.log('[create-payment-link] Resend:', sendRes.status, resendBody.slice(0, 200))
    }

    return json({ ok: true, url: session.url })

  } catch (e) {
    console.error('[create-payment-link] CRASH:', e)
    return json({ error: 'Erreur interne', detail: String(e) }, 500)
  }
})
