import { useEffect } from 'react'

// Fonts already bundled in index.html — no dynamic load needed
const PRELOADED = new Set(['Inter', 'Jost', 'Cormorant'])

export const BRAND_FONTS = [
  { value: 'Inter',      label: 'Inter — Sans-serif moderne (défaut)' },
  { value: 'Jost',       label: 'Jost — Épuré & géométrique' },
  { value: 'Cormorant',  label: 'Cormorant — Serif luxueux' },
  { value: 'Poppins',    label: 'Poppins — Rond & contemporain' },
  { value: 'Montserrat', label: 'Montserrat — Géométrique premium' },
]

// ─── Colour helpers ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function clamp(n: number) { return Math.min(255, Math.max(0, Math.round(n))) }
function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')
}

function darken(hex: string, pct: number) {
  const [r, g, b] = hexToRgb(hex)
  const f = 1 - pct / 100
  return toHex(r * f, g * f, b * f)
}
function lighten(hex: string, pct: number) {
  const [r, g, b] = hexToRgb(hex)
  const f = pct / 100
  return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  primary?: string | null
  secondary?: string | null
  font?: string | null
}

export default function BrandStyle({ primary, secondary: _secondary, font }: Props) {
  // Load Google Font dynamically when it isn't already in index.html
  useEffect(() => {
    if (!font || PRELOADED.has(font)) return
    const id = `gfont-${font.replace(/\s+/g, '-')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`
    document.head.appendChild(link)
  }, [font])

  if (!primary && !font) return null

  const p = primary!
  const pDark   = darken(p, 12)
  const pDarker = darken(p, 22)
  const pMed    = darken(p, 7)
  const pFaint  = lighten(p, 88)

  // Tailwind hover/focus selectors need escaped colons
  const css = `
    :root {
      --brand-primary: ${p};
      --brand-primary-dark: ${pDark};
    }
    /* ── Sidebar & main bg ── */
    .bg-brand-800  { background-color: ${p}       !important; }
    .bg-brand-900  { background-color: ${pDarker} !important; }
    .bg-brand-700  { background-color: ${pDark}   !important; }
    .bg-brand-400  { background-color: ${p}       !important; }
    .bg-brand-50   { background-color: ${pFaint}  !important; }
    /* ── Sidebar borders ── */
    .border-brand-700 { border-color: ${pMed}   !important; }
    .border-brand-400 { border-color: ${p}      !important; }
    /* ── Sidebar text (on dark bg → keep white-ish) ── */
    .text-brand-200 { color: rgba(255,255,255,0.78) !important; }
    .text-brand-300 { color: rgba(255,255,255,0.55) !important; }
    /* ── Accent text outside sidebar ── */
    .text-brand-700 { color: ${p}       !important; }
    .text-brand-800 { color: ${p}       !important; }
    .text-brand-900 { color: ${pDarker} !important; }
    /* ── Interactive states ── */
    .hover\\:bg-brand-700:hover { background-color: ${pDark}   !important; }
    .hover\\:bg-brand-800:hover { background-color: ${p}       !important; }
    .hover\\:text-brand-900:hover { color: ${pDarker}          !important; }
    .hover\\:text-brand-800:hover { color: ${p}                !important; }
    /* ── Focus rings ── */
    .focus\\:ring-brand-400:focus { --tw-ring-color: ${p} !important; }
    /* ── Form accents ── */
    .accent-brand-800 { accent-color: ${p} !important; }
    ${font ? `body, .font-sans { font-family: '${font}', system-ui, sans-serif; }` : ''}
  `

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
