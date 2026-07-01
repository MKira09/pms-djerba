import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Check, Loader2, Star } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { FULL_ACCESS_EMAILS } from '@/lib/utils'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Pour démarrer et gérer vos premières villas.',
    highlight: false,
    features: [
      'Jusqu\'à 3 villas',
      'Réservations illimitées',
      'Calendrier & planning',
      'Emails automatiques (confirmation, rappel, avis)',
      '1 utilisateur',
      'Support par email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    description: 'Pour les gestionnaires qui veulent aller plus loin.',
    highlight: true,
    features: [
      'Jusqu\'à 10 villas',
      'Tout Starter inclus',
      'Analytics & revenus',
      'Extras & services configurables',
      'Jusqu\'à 5 utilisateurs',
      'Support prioritaire',
    ],
  },
  {
    id: 'agence',
    name: 'Agence',
    price: 99,
    description: 'Pour les agences avec un grand portefeuille.',
    highlight: false,
    features: [
      'Villas illimitées',
      'Tout Pro inclus',
      'Utilisateurs illimités',
      'Accès API',
      'Onboarding personnalisé',
      'Support dédié',
    ],
  },
]

const FOUNDING_MAX = 5

function hasFullAccess(t: { founding_member?: boolean | null; plan: string; trial_ends: string | null }) {
  if (t.founding_member === true) return true
  if ((t.plan === 'pro' || t.plan === 'agence') && t.trial_ends === null) return true
  return false
}

export default function PlansPage() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [foundingCount, setFoundingCount] = useState<number | null>(null)

  // Redirect users who already have full access (founding member or paid pro/agence)
  useEffect(() => {
    async function checkAccess() {
      // Fast path: tenant already in store
      if (tenant && hasFullAccess(tenant)) {
        navigate('/dashboard', { replace: true })
        return
      }
      // Slow path: user arrived via magic link — session exists but store is empty
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Email-based bypass — always redirect regardless of DB state
      if (FULL_ACCESS_EMAILS.includes(user.email ?? '')) {
        navigate('/dashboard', { replace: true })
        return
      }
      const { data: profile } = await supabase
        .from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile) return
      const { data: t } = await supabase
        .from('tenants').select('founding_member, plan, trial_ends').eq('id', profile.tenant_id).single()
      if (t && hasFullAccess(t)) navigate('/dashboard', { replace: true })
    }
    checkAccess()
  }, [tenant])

  useEffect(() => {
    supabase.rpc('get_founding_member_count').then(({ data }) => {
      if (typeof data === 'number') setFoundingCount(data)
    })
  }, [])

  const remaining = foundingCount !== null ? Math.max(0, FOUNDING_MAX - foundingCount) : null

  async function handleChoosePlan(planId: string) {
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || 'Erreur lors de la création de la session Stripe.')
        return
      }
      window.location.href = data.url
    } catch (err) {
      toast.error('Erreur réseau. Réessayez.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-800 rounded-xl flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">VillaHub</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Se connecter</Button>
        </div>
      </header>

      {/* Founding member banner */}
      {(remaining === null || remaining > 0) && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-400 rounded-xl shrink-0">
              <Star className="h-5 w-5 text-white fill-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900">Offre de lancement — Membres fondateurs</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Les 5 premiers clients bénéficient de <strong>biens illimités à vie</strong>, quel que soit le plan choisi.
              </p>
            </div>
            <div className="shrink-0 text-center bg-amber-400 text-amber-900 font-bold rounded-xl px-4 py-2 text-sm">
              {remaining !== null
                ? remaining > 0
                  ? <>{remaining} place{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}</>
                  : 'Complet'
                : '…'}
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="text-center py-14 px-4">
        <span className="inline-block bg-brand-100 text-brand-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Gestion de villas · Simple et efficace
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choisissez votre plan
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Gérez vos villas de location, vos réservations et vos clients depuis une seule plateforme.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-8 flex flex-col ${
              plan.highlight
                ? 'border-brand-800 bg-brand-800 text-white shadow-2xl scale-105'
                : 'border-gray-200 bg-white text-gray-900 shadow-md'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                ⭐ Populaire
              </div>
            )}

            <div className="mb-6">
              <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h2>
              <p className={`text-sm mb-4 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}€
                </span>
                <span className={`text-sm ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>/mois</span>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-brand-200' : 'text-brand-700'}`} />
                  <span className={plan.highlight ? 'text-brand-100' : 'text-gray-600'}>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleChoosePlan(plan.id)}
              disabled={!!loadingPlan}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                plan.highlight
                  ? 'bg-white text-brand-800 hover:bg-brand-50'
                  : 'bg-brand-800 text-white hover:bg-brand-900'
              }`}
            >
              {loadingPlan === plan.id
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirection…</>
                : 'Choisir ce plan'
              }
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 pb-10">
        Annulation à tout moment · Paiement mensuel sans engagement
      </p>
    </div>
  )
}
