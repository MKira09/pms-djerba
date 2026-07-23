import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-push-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const secret = req.headers['x-push-secret']
  if (!secret || secret !== process.env.PUSH_SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const vapidPublic  = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return res.status(500).json({ error: 'VAPID keys manquantes dans les variables Vercel' })
  }
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase config manquante' })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}

  const { tenantId, title, message, url } = body
  if (!tenantId) return res.status(400).json({ error: 'tenantId requis' })

  const sb = createClient(supabaseUrl, serviceKey)
  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[send-push] fetch error:', error)
    return res.status(500).json({ error: 'Erreur DB' })
  }

  const payload = JSON.stringify({ title: title ?? 'VillaHub', body: message, url: url ?? '/reservations' })

  const results = await Promise.allSettled(
    (subs ?? []).map(async ({ id, subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload)
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — clean up
          await sb.from('push_subscriptions').delete().eq('id', id)
        }
        throw err
      }
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  return res.status(200).json({ sent, failed })
}
