// Shared email template helpers for all client-facing emails.
// Uses Jost (body) + Cormorant (titles/codes) with safe fallbacks.

export interface TenantBrand {
  name: string
  logoUrl: string | null
  slogan: string | null
  primaryColor: string   // hex, e.g. '#6B7C45'
}

export interface Contact {
  name: string
  role: string
  phone: string
}

// ─── Block builders ──────────────────────────────────────────────────────────

export function infoBlock(label: string, html: string, accent: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px">
  <tr>
    <td width="3" bgcolor="${accent}" style="border-radius:3px 0 0 3px;line-height:1">&nbsp;</td>
    <td style="background:#FDFBF8;padding:14px 20px;border-radius:0 8px 8px 0">
      <p style="margin:0 0 5px;font-size:9px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${accent};font-family:'Jost','Helvetica Neue',Arial,sans-serif">${label}</p>
      <div style="font-size:14px;color:#0D1F2D;font-family:'Jost','Helvetica Neue',Arial,sans-serif;line-height:1.65">${html}</div>
    </td>
  </tr>
</table>`
}

export function codeBlock(label: string, code: string, accent: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px">
  <tr>
    <td width="3" bgcolor="${accent}" style="border-radius:3px 0 0 3px;line-height:1">&nbsp;</td>
    <td style="background:#FDFBF8;padding:16px 20px;border-radius:0 8px 8px 0">
      <p style="margin:0 0 6px;font-size:9px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${accent};font-family:'Jost','Helvetica Neue',Arial,sans-serif">${label}</p>
      <p style="margin:0;font-family:'Cormorant','Georgia','Times New Roman',serif;font-size:34px;font-weight:600;color:#2D3E28;letter-spacing:0.2em">${code}</p>
    </td>
  </tr>
</table>`
}

export function contactsBlock(contacts: Contact[], accent: string): string {
  if (!contacts.length) return ''
  const rows = contacts
    .map(c => `<p style="margin:0 0 6px;font-size:14px;color:#0D1F2D;font-family:'Jost','Helvetica Neue',Arial,sans-serif">
      <strong>${c.name}</strong>${c.role ? ` &middot; ${c.role}` : ''}&ensp;<a href="tel:${c.phone}" style="color:${accent};text-decoration:none">${c.phone}</a>
    </p>`)
    .join('')
  return infoBlock('Vos contacts', rows, accent)
}

// ─── Outer wrapper ───────────────────────────────────────────────────────────

export function emailWrap(
  brand: TenantBrand,
  title: string,
  banner: string | null,
  body: string,
): string {
  const accent = brand.primaryColor || '#6B7C45'

  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="" width="52" height="52" style="display:block;margin:0 auto 14px;border-radius:10px;object-fit:cover;border:0"/>`
    : ''

  const sloganHtml = brand.slogan
    ? `<p style="margin:8px 0 0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:300;color:rgba(255,255,255,0.6);letter-spacing:0.1em">${brand.slogan}</p>`
    : ''

  const bannerRow = banner
    ? `<tr>
        <td style="background:#2D3E28;padding:13px 40px;text-align:center">
          <p style="margin:0;font-family:'Cormorant','Georgia','Times New Roman',serif;font-size:19px;font-style:italic;font-weight:400;color:#FFFFFF;letter-spacing:0.03em">${banner}</p>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;1,400;1,500&amp;family=Jost:wght@300;400;500&amp;display=swap" rel="stylesheet"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:36px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(13,31,45,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:${accent};padding:36px 40px 28px;text-align:center">
            ${logoHtml}
            <p style="margin:0;font-family:'Cormorant','Georgia','Times New Roman',serif;font-size:28px;font-weight:500;color:#FFFFFF;letter-spacing:0.05em">${brand.name}</p>
            ${sloganHtml}
          </td>
        </tr>

        ${bannerRow}

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 40px;border-top:1px solid #EDE8DF;text-align:center">
            <p style="margin:0;font-family:'Jost','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#B0BAC0;letter-spacing:0.1em;text-transform:uppercase">${brand.name}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Date helper ─────────────────────────────────────────────────────────────

export function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}
