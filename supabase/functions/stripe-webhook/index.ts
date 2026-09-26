// Webhook Stripe : confirme le paiement d'une réservation après un checkout
// réussi (lien de paiement envoyé par create-payment-link), et exclut cette
// réservation du calcul de la commission mensuelle (déjà prélevée par Stripe
// via application_fee_amount au moment du paiement).
//
// À configurer dans Stripe Dashboard → Developers → Webhooks :
//   Endpoint URL : <SUPABASE_URL>/functions/v1/stripe-webhook
//   Événement    : checkout.session.completed
// Puis copier le "Signing secret" dans les secrets Supabase (STRIPE_WEBHOOK_SECRET).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const STRIPE_KEY     = Deno.env.get('STRIPE_SECRET_KEY')
  const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!STRIPE_KEY || !WEBHOOK_SECRET) return json({ error: 'STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant' }, 500)
  if (!SUPABASE_URL || !SUPABASE_SVC) return json({ error: 'Variables Supabase manquantes' }, 500)

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' })
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] signature invalide:', (err as Error).message)
    return json({ error: 'Signature invalide' }, 400)
  }

  console.log('[stripe-webhook] événement reçu:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const reservationId = session.metadata?.reservation_id

    if (reservationId) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SVC)
      const { error } = await sb
        .from('reservations')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_method: 'stripe',
        })
        .eq('id', reservationId)

      if (error) console.error('[stripe-webhook] échec mise à jour réservation:', error.message)
      else console.log('[stripe-webhook] réservation marquée payée:', reservationId)
    } else {
      console.warn('[stripe-webhook] session sans reservation_id en métadonnée')
    }
  }

  return json({ received: true })
})
