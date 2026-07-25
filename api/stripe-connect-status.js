export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  const { account_id } = req.query
  if (!account_id) return res.status(400).json({ error: 'account_id requis' })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY manquante' })

  try {
    const resp = await fetch(`https://api.stripe.com/v1/accounts/${account_id}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    })
    const account = await resp.json()
    if (!resp.ok) return res.status(400).json({ error: account.error?.message ?? 'Compte introuvable' })

    return res.status(200).json({
      charges_enabled:   account.charges_enabled   ?? false,
      details_submitted: account.details_submitted ?? false,
      payouts_enabled:   account.payouts_enabled   ?? false,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
