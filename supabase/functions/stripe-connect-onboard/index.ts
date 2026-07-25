import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const STRIPE_KEY   = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const APP_URL      = Deno.env.get('APP_URL') ?? 'https://agencykira.com'

    if (!STRIPE_KEY)                    return json({ error: 'STRIPE_SECRET_KEY manquante' }, 500)
    if (!SUPABASE_URL || !SUPABASE_SVC) return json({ error: 'Variables Supabase manquantes' }, 500)

    const { tenant_id } = await req.json() as { tenant_id: string }
    if (!tenant_id) return json({ error: 'tenant_id requis' }, 400)

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    const { data: tenant, error: tErr } = await sb
      .from('tenants')
      .select('stripe_account_id, name')
      .eq('id', tenant_id)
      .single()

    if (tErr || !tenant) return json({ error: 'Tenant introuvable' }, 404)

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' })

    let accountId: string = tenant.stripe_account_id

    if (!accountId) {
      // First time: create the Express account
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { tenant_id, tenant_name: tenant.name ?? '' },
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
      })
      accountId = account.id

      // Save immediately so return_url can rely on it
      await sb.from('tenants').update({ stripe_account_id: accountId }).eq('id', tenant_id)
    }

    // Check current onboarding state
    const account = await stripe.accounts.retrieve(accountId)
    const isComplete = account.charges_enabled && account.details_submitted

    if (isComplete) {
      // Account fully onboarded → redirect to their Express dashboard
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return json({ url: loginLink.url, type: 'dashboard' })
    }

    // Account not yet complete → fresh onboarding link (works for new AND partially done)
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${APP_URL}/settings?stripe_refresh=1`,
      return_url:  `${APP_URL}/settings?stripe_return=1`,
      type:        'account_onboarding',
    })

    return json({ url: accountLink.url, type: 'onboarding', account_id: accountId })

  } catch (e) {
    // Return 200 so the client reads the error body (non-2xx swallows the detail)
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stripe-connect-onboard] ERROR:', msg)
    return json({ error: msg })
  }
})
