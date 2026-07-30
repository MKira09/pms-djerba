import { createClient } from 'jsr:@supabase/supabase-js@2'

// Cette fonction est publique (no JWT) — le lien est dans l'email du client.
// La sécurité repose sur l'opacité du chemin (tenantId/année/filename).
// Supabase Storage force Content-Type: text/plain sur les .html (anti-XSS CDN) ;
// on contourne en récupérant le fichier côté serveur et en servant avec les bons headers.

Deno.serve(async (req) => {
  // CORS pour préflight (peu probable sur une navigation directe, mais propre)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')

  if (!path) {
    return htmlError(400, 'Lien invalide', 'Le paramètre "path" est manquant.')
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SVC) {
    return htmlError(500, 'Erreur de configuration', 'Variables d\'environnement manquantes.')
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SVC)

    // Télécharger le fichier depuis Storage avec le service role (bypasse les headers CDN)
    const { data, error } = await sb.storage.from('factures').download(path)

    if (error || !data) {
      console.warn('[view-invoice] download error:', error)
      return htmlError(
        404,
        'Document introuvable',
        'Ce lien est peut-être expiré ou le document a été supprimé. Contactez votre agence.',
      )
    }

    const html = await data.text()

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
        // Permet les polices Google Fonts depuis l'iframe du navigateur
        'Content-Security-Policy': [
          "default-src 'self'",
          "style-src 'unsafe-inline' https://fonts.googleapis.com",
          "font-src https://fonts.gstatic.com",
          "script-src 'unsafe-inline'",
          "img-src 'self' data:",
        ].join('; '),
      },
    })
  } catch (e) {
    console.error('[view-invoice] crash:', e)
    return htmlError(500, 'Erreur serveur', String(e))
  }
})

function htmlError(status: number, title: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .box{text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,.08);max-width:420px}
    h1{font-size:1.2rem;color:#333;margin:0 0 12px}p{color:#666;font-size:.9rem;line-height:1.6;margin:0}</style>
    </head><body><div class="box"><h1>${title}</h1><p>${message}</p></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
