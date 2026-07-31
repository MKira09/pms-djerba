import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// Génère le PDF de la facture côté serveur avec un vrai Chrome headless.
//
// Pourquoi : la génération côté navigateur (html2canvas) s'est montrée peu
// fiable — plusieurs pistes (scripts embarqués, polices cross-origin, import
// dynamique) ont été corrigées sans résoudre le vrai problème : le rendu
// sortait systématiquement sans aucune mise en forme (texte brut, sans
// couleurs ni tableau). On sait par ailleurs que l'impression native du
// navigateur (Cmd+P) rend ce même HTML parfaitement — Puppeteer utilise
// exactement ce même moteur d'impression Chrome, en headless et sans
// interaction utilisateur, donc sans les soucis d'en-tête/pied de page.
//
// Reçoit { html } en POST, renvoie { pdf_base64 }.

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  const { html } = body
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Champ "html" manquant' })
  }

  let browser
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
    // Laisse le temps aux Google Fonts embarquées de finir de se charger.
    await page.evaluateHandle('document.fonts.ready')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      displayHeaderFooter: false,
    })

    return res.status(200).json({ pdf_base64: Buffer.from(pdfBuffer).toString('base64') })
  } catch (err) {
    console.error('[generate-invoice-pdf] error:', err)
    return res.status(500).json({ error: 'Échec de génération du PDF', detail: String(err?.message ?? err) })
  } finally {
    if (browser) {
      try {
        for (const page of await browser.pages()) await page.close()
      } catch { /* noop */ }
      await browser.close()
    }
  }
}
