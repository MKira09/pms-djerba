// Notifie contact.agencykira@gmail.com à chaque nouvelle inscription d'agence.
// Appelée en "fire-and-forget" depuis RegisterPage.tsx juste après la création
// du tenant — un échec ici ne doit jamais bloquer l'inscription du client.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'
const TO_EMAIL       = 'contact.agencykira@gmail.com'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { agency_name, owner_name, owner_email, plan } = await req.json()

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Nouvelle inscription VillaHub</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:560px">
        <tr>
          <td style="background:#3D5A3E;padding:32px 40px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:0.16em;text-transform:uppercase">VillaHub</p>
            <h1 style="margin:12px 0 0;color:#FFFFFF;font-size:20px;font-weight:600">Nouvelle agence inscrite</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE8DF;border-radius:8px;overflow:hidden">
              <tr style="background:#F9FAFB">
                <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Agence</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0D1F2D;text-align:right">${agency_name ?? '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Propriétaire</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0D1F2D;text-align:right">${owner_name ?? '—'}</td>
              </tr>
              <tr style="background:#F9FAFB">
                <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Email</td>
                <td style="padding:10px 16px;font-size:13px;color:#0D1F2D;text-align:right">${owner_email ?? '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7A85">Plan</td>
                <td style="padding:10px 16px;font-size:13px;color:#0D1F2D;text-align:right">${plan ?? 'starter'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: `Nouvelle agence inscrite — ${agency_name ?? 'sans nom'}`,
        html,
      }),
    })

    if (!res.ok) {
      console.error('[notify-signup] Resend error:', await res.text())
      return new Response('Email send failed', { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[notify-signup] error:', e)
    return new Response('Bad request', { status: 400, headers: CORS })
  }
})
