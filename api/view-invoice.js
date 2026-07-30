import { createClient } from '@supabase/supabase-js'

// Sert les factures HTML stockées dans Supabase Storage, depuis notre propre domaine.
// Pourquoi cette route existe : Supabase force Content-Type: text/plain sur le HTML
// servi depuis *.supabase.co (Storage ET Edge Functions), pour éviter que son domaine
// serve des pages web arbitraires. Résultat : le navigateur affichait le code source
// brut au lieu de la facture. En passant par notre propre domaine (agencykira.com),
// cette restriction ne s'applique plus.
//
// Sécurité : route publique (le lien est envoyé par email au client), protégée par
// l'opacité du chemin de stockage (tenantId/année/filename.html).

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    return res.status(200).end()
  }

  const { path } = req.query

  if (!path) {
    return htmlError(res, 400, 'Lien invalide', 'Le paramètre "path" est manquant.')
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SVC) {
    return htmlError(
      res,
      500,
      'Erreur de configuration',
      "Variables d'environnement manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) dans Vercel.",
    )
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    const { data, error } = await sb.storage.from('factures').download(path)

    if (error || !data) {
      console.warn('[view-invoice] download error:', error)
      return htmlError(
        res,
        404,
        'Document introuvable',
        'Ce lien est peut-être expiré ou le document a été supprimé. Contactez votre agence.',
      )
    }

    const html = await data.text()

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "style-src 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "script-src 'unsafe-inline'",
      "img-src 'self' data:",
    ].join('; '))

    return res.status(200).send(html)
  } catch (e) {
    console.error('[view-invoice] crash:', e)
    return htmlError(res, 500, 'Erreur serveur', String(e))
  }
}

function htmlError(res, status, title, message) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(status).send(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .box{text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.08);max-width:420px}
    h1{font-size:1.2rem;color:#333;margin:0 0 12px}p{color:#666;font-size:.9rem;line-height:1.6;margin:0}</style>
    </head><body><div class="box"><h1>${title}</h1><p>${message}</p></div></body></html>`,
  )
}
