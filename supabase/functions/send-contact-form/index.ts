const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'VillaHub <contact@agencykira.com>'
const TO_EMAIL       = 'contact.agencykira@gmail.com'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { name, email, phone, message } = await req.json()

  if (!name || !email || !message) {
    return new Response('Missing required fields', { status: 400, headers: CORS })
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Nouveau message de contact</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px">

        <!-- Header -->
        <tr>
          <td style="background:#3D5A3E;padding:36px 40px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:0.16em;text-transform:uppercase">VillaHub</p>
            <h1 style="margin:12px 0 0;color:#FFFFFF;font-size:22px;font-weight:600;letter-spacing:0.02em">
              Nouveau message de contact
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:24px;border-bottom:1px solid #EDE8DF">
                  <p style="margin:0 0 4px;font-size:11px;color:#6B7A85;letter-spacing:0.12em;text-transform:uppercase">Expéditeur</p>
                  <p style="margin:0;font-size:18px;font-weight:600;color:#0D1F2D">${name}</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#6B7A85">
                    <a href="mailto:${email}" style="color:#07BEB8;text-decoration:none">${email}</a>
                    ${phone ? ` &nbsp;·&nbsp; <a href="tel:${phone}" style="color:#07BEB8;text-decoration:none">${phone}</a>` : ''}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding-top:28px">
                  <p style="margin:0 0 12px;font-size:11px;color:#6B7A85;letter-spacing:0.12em;text-transform:uppercase">Message</p>
                  <div style="background:#F5F0E8;border-radius:8px;padding:20px 24px">
                    <p style="margin:0;font-size:15px;color:#0D1F2D;line-height:1.75;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F0E8;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9CA3AF">
              Message envoyé via le formulaire de contact VillaHub
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `Nouveau message de contact — ${name}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[send-contact-form] Resend error:', err)
    return new Response('Email send failed', { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
