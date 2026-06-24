exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const {
      clientEmail, clientName, villaName,
      checkIn, checkOut, checkInTime, checkOutTime,
      totalAmount, agencyName,
    } = JSON.parse(event.body ?? '{}')

    if (!clientEmail || !villaName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not configured' }) }
    }

    const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e3a5f;padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:-0.5px;">VillaHub</h1>
      <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">Gérez vos locations saisonnières en toute simplicité</p>
    </div>

    <div style="padding:32px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;color:#16a34a;font-size:18px;font-weight:bold;">✅ Réservation confirmée</p>
      </div>

      <p style="color:#374151;font-size:15px;">Bonjour <strong>${clientName || 'Client'}</strong>,</p>
      <p style="color:#374151;font-size:15px;">Votre réservation a bien été enregistrée. Voici le récapitulatif :</p>

      <table style="width:100%;border-collapse:collapse;margin:24px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">🏠 Villa</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${villaName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">📅 Arrivée</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${checkIn}${checkInTime ? ' à ' + checkInTime : ''}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">📅 Départ</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${checkOut}${checkOutTime ? ' à ' + checkOutTime : ''}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;color:#1e3a5f;font-weight:700;font-size:15px;">💰 Montant total</td>
          <td style="padding:14px 16px;font-weight:700;text-align:right;color:#1e3a5f;font-size:18px;">${totalAmount} TND</td>
        </tr>
      </table>

      <p style="color:#374151;font-size:14px;">Pour toute question, contactez <strong>${agencyName || 'VillaHub'}</strong>.</p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Propulsé par <strong>VillaHub</strong></p>
    </div>
  </div>
</body>
</html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VillaHub <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `✅ Réservation confirmée — ${villaName}`,
        html,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { statusCode: 500, body: JSON.stringify({ error: text }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
