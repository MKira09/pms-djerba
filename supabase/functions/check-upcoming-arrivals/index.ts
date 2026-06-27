import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SELF_URL         = Deno.env.get('SUPABASE_FUNCTIONS_URL') ?? `${SUPABASE_URL}/functions/v1`

// Cette fonction est appelée toutes les heures via pg_cron :
// SELECT cron.schedule('check-arrivals', '0 * * * *', $$
//   SELECT net.http_post(
//     url := 'https://<project>.supabase.co/functions/v1/check-upcoming-arrivals',
//     headers := '{"Authorization": "Bearer <anon_key>"}',
//     body := '{}'
//   );
// $$);

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Fenêtre : entre maintenant+1h et maintenant+3h
  const from = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10)
  const to   = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Récupère les réservations dont le check_in est aujourd'hui
  // et l'heure d'arrivée dans ~2h
  const now = new Date()
  const targetHour = now.getUTCHours() + 2

  const { data: reservations, error } = await sb
    .from('reservations')
    .select('id, check_in, check_in_time, tenant_id, client_id')
    .eq('status', 'confirmed')
    .eq('check_in', from)
    .not('client_id', 'is', null)

  if (error) {
    console.error('Query error:', error)
    return new Response('DB error', { status: 500 })
  }

  const results: { id: string; sent: boolean; reason?: string }[] = []

  for (const r of (reservations ?? [])) {
    // Vérifier si l'heure d'arrivée correspond à +2h
    const arrivalHour = r.check_in_time
      ? parseInt(r.check_in_time.split(':')[0], 10)
      : 15 // défaut 15h

    if (Math.abs(arrivalHour - targetHour) > 1) {
      results.push({ id: r.id, sent: false, reason: 'not in window' })
      continue
    }

    // Appeler la fonction d'envoi
    try {
      const res = await fetch(`${SELF_URL}/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE}`,
        },
        body: JSON.stringify({ reservation_id: r.id }),
      })
      results.push({ id: r.id, sent: res.ok, reason: res.ok ? undefined : await res.text() })
    } catch (e) {
      results.push({ id: r.id, sent: false, reason: String(e) })
    }
  }

  console.log('check-upcoming-arrivals results:', results)
  return new Response(JSON.stringify({ checked: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
