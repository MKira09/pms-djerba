import { useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

interface TourStep {
  target: string   // matches data-tour="..." on the sidebar link
  title: string
  body: string
}

const STEPS: TourStep[] = [
  { target: 'nav-dashboard',       title: 'Tableau de bord',   body: "Vos revenus du mois, le taux d'occupation, et les arrivées/départs du jour, en un coup d'œil." },
  { target: 'nav-villas',          title: 'Mes biens',          body: 'Ajoutez vos villas, gérez leurs tarifs et photos, et retrouvez ici le lien de votre catalogue à partager à vos clients.' },
  { target: 'nav-calendar',        title: 'Calendrier',         body: 'Toutes vos réservations et périodes bloquées, villa par villa.' },
  { target: 'nav-reservations',    title: 'Réservations',       body: 'Confirmez ou refusez les demandes, encaissez les paiements et envoyez les documents.' },
  { target: 'nav-communications',  title: 'Communications',     body: 'Personnalisez les emails automatiques envoyés à vos clients (confirmation, bienvenue, rappels...).' },
  { target: 'nav-settings',        title: 'Paramètres',         body: 'Vos moyens de paiement, votre devise, et la personnalisation de votre catalogue public.' },
]

function tourStorageKey(profileId: string) {
  return `villahub_tour_seen_${profileId}`
}

interface Rect { top: number; left: number; width: number; height: number }

export default function ProductTour({ onDone }: { onDone: () => void }) {
  const { profile } = useAuthStore()
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [skippedMobile, setSkippedMobile] = useState(false)

  const step = STEPS[stepIndex]

  useEffect(() => {
    // La visite cible la sidebar desktop — sur petit écran elle est masquée
    // (bottom nav à la place), donc on n'affiche rien plutôt qu'une visite cassée.
    if (window.innerWidth < 768) {
      setSkippedMobile(true)
      finish()
      return
    }
    function measure() {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [stepIndex])

  function finish() {
    if (profile?.id) localStorage.setItem(tourStorageKey(profile.id), '1')
    onDone()
  }

  function next() {
    if (stepIndex >= STEPS.length - 1) { finish(); return }
    setStepIndex(i => i + 1)
  }

  if (skippedMobile || !rect) return null

  const PAD = 6
  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 10,
    boxShadow: '0 0 0 9999px rgba(13,31,45,0.6)',
    transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
    pointerEvents: 'none',
    zIndex: 100,
  }

  // Tooltip juste à droite de la sidebar (largeur fixe 256px), aligné verticalement sur la cible.
  const tooltipTop = Math.min(Math.max(rect.top - 8, 16), window.innerHeight - 200)
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: tooltipTop,
    left: rect.left + rect.width + 20,
    zIndex: 101,
    transition: 'top 0.25s ease',
  }

  return (
    <>
      <div style={highlightStyle} />
      <div style={tooltipStyle} className="w-72 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
          <button onClick={finish} className="text-gray-300 hover:text-gray-500 shrink-0" title="Fermer la visite">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-4 bg-brand-700' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={finish} className="text-xs text-gray-400 hover:text-gray-600">Passer</button>
            <button
              onClick={next}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-800 text-white hover:bg-brand-900 transition-colors"
            >
              {stepIndex === STEPS.length - 1 ? 'Terminer' : 'Suivant'}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function hasSeenTour(profileId: string | undefined): boolean {
  if (!profileId) return true
  return localStorage.getItem(tourStorageKey(profileId)) === '1'
}
