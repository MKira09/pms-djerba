// Déclenchement manuel de la facturation mensuelle depuis /admin, sans avoir
// à coller une URL contenant CRON_SECRET dans le navigateur. Le secret reste
// entièrement côté serveur : le frontend envoie juste le token de session de
// l'utilisateur connecté, vérifié ici avant de relayer l'appel vers
// /api/monthly-billing avec le vrai secret.

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET       = process.env.CRON_SECRET
const APP_URL           = process.env.APP_URL ?? 'https://agencykira.com'
const ADMIN_EMAIL       = 'prokmbconsulting@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  // Vérifie que le token correspond bien au super-admin.
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const user = await userRes.json()
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const period = typeof req.body === 'object' ? req.body?.period : undefined

  const url = new URL('/api/monthly-billing', APP_URL)
  if (period) url.searchParams.set('period', period)

  try {
    const billingRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(55000),
    })
    const data = await billingRes.json().catch(() => ({}))
    return res.status(billingRes.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: 'Billing trigger failed: ' + e.message })
  }
}
