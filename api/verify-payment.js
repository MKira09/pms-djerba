export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'session_id manquant' })

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY manquante' })

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    const session = await response.json()
    if (!response.ok) return res.status(500).json({ error: session.error?.message })

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Paiement non complété', status: session.payment_status })
    }

    return res.status(200).json({
      email: session.customer_details?.email ?? '',
      name:  session.customer_details?.name  ?? '',
      plan:  session.metadata?.plan          ?? 'starter',
    })
  } catch (err) {
    console.error('verify-payment error:', err)
    return res.status(500).json({ error: err.message })
  }
}
