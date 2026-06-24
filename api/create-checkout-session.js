const PLANS = {
  starter: { amount: 2900, name: 'VillaHub Starter', description: "Jusqu'à 3 villas" },
  pro:     { amount: 5900, name: 'VillaHub Pro',     description: "Jusqu'à 10 villas" },
  agence:  { amount: 9900, name: 'VillaHub Agence',  description: 'Villas illimitées' },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    body = body || {}

    const { plan } = body
    const planInfo = PLANS[plan]
    if (!planInfo) return res.status(400).json({ error: 'Plan invalide : ' + plan })

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY manquante dans les variables Vercel' })

    const origin = req.headers.origin || 'https://villahub-ochre.vercel.app'
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`

    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('payment_method_types[]', 'card')
    params.append('line_items[0][price_data][currency]', 'eur')
    params.append('line_items[0][price_data][product_data][name]', planInfo.name)
    params.append('line_items[0][price_data][product_data][description]', planInfo.description)
    params.append('line_items[0][price_data][unit_amount]', String(planInfo.amount))
    params.append('line_items[0][price_data][recurring][interval]', 'month')
    params.append('line_items[0][quantity]', '1')
    params.append('success_url', `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`)
    params.append('cancel_url', `${baseUrl}/plans`)
    params.append('metadata[plan]', plan)
    params.append('customer_creation', 'always')
    params.append('billing_address_collection', 'auto')

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await response.json()
    if (!response.ok) {
      console.error('Stripe error:', session)
      return res.status(500).json({ error: session.error?.message || 'Erreur Stripe' })
    }

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return res.status(500).json({ error: err.message })
  }
}
