import { useNavigate } from 'react-router-dom'
import { Home, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

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

export default function PlansPage() {
  const navigate = useNavigate()

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
              onClick={() => navigate(`/register?plan=${plan.id}`)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                plan.highlight
                  ? 'bg-white text-brand-800 hover:bg-brand-50'
                  : 'bg-brand-800 text-white hover:bg-brand-900'
              }`}
            >
              Choisir ce plan
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
