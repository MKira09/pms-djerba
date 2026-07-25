// Vercel Edge Middleware — runs at the CDN edge before any routing.
// Only intercepts GET "/" when MAINTENANCE_MODE=true in Vercel env vars.
// All other paths (/login, /dashboard, /catalogue/*, etc.) pass through untouched.

export const config = { matcher: '/' }

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VillaHub — Maintenance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #F5F0E8;
      color: #0D1F2D;
      font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 2rem;
    }

    .card {
      text-align: center;
      max-width: 480px;
      width: 100%;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #3D5A3E;
      color: #F5F0E8;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: .14em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 2.75rem;
    }

    .badge::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #A8C09A;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    .logo {
      font-size: 1.75rem;
      font-weight: 300;
      letter-spacing: .1em;
      color: #3D5A3E;
      text-transform: uppercase;
      margin-bottom: .4rem;
    }

    .sub {
      font-size: 1rem;
      font-weight: 300;
      font-style: italic;
      color: #6B7A85;
      letter-spacing: .03em;
      margin-bottom: 3rem;
    }

    .divider {
      width: 48px;
      height: 1px;
      background: #3D5A3E;
      opacity: .25;
      margin: 0 auto 3rem;
    }

    h1 {
      font-size: clamp(2rem, 6vw, 2.75rem);
      font-weight: 300;
      line-height: 1.2;
      color: #3D5A3E;
      margin-bottom: 1.25rem;
    }

    p {
      font-size: 1.2rem;
      font-weight: 300;
      color: #6B7A85;
      line-height: 1.85;
    }

    footer {
      position: fixed;
      bottom: 1.75rem;
      left: 0;
      right: 0;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 10px;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: #B5AFA5;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">En maintenance</span>
    <div class="logo">VillaHub</div>
    <div class="sub">Gestion de villas, simplifiée</div>
    <div class="divider"></div>
    <h1>Nous travaillons<br/>pour vous</h1>
    <p>
      Nous améliorons votre expérience.<br/>
      De retour très bientôt.
    </p>
  </div>
  <footer>© 2025 VillaHub &nbsp;·&nbsp; agencykira.com</footer>
</body>
</html>`

export default function middleware(_request: Request): Response | void {
  if (process.env.MAINTENANCE_MODE !== 'true') return

  return new Response(HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '3600',
      'Cache-Control': 'no-store',
    },
  })
}
