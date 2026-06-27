import { Check } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { PLAN_PRICES, PLAN_LIMITS } from '@/lib/utils'
import toast from 'react-hot-toast'

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: PLAN_PRICES.starter,
    villas: PLAN_LIMITS.starter,
    features: ['Jusqu\'à 5 villas', 'Calendrier & réservations', 'Gestion équipe ménage', 'Dashboard basique', 'Support WhatsApp'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: PLAN_PRICES.pro,
    villas: PLAN_LIMITS.pro,
    features: ['Jusqu\'à 15 villas', 'Tout Starter +', 'Tarification dynamique', 'Emails automatiques', 'Statistiques avancées', 'Export Excel / CSV'],
    highlight: true,
  },
  {
    key: 'agence',
    label: 'Agence',
    price: PLAN_PRICES.agence,
    villas: PLAN_LIMITS.agence,
    features: ['Jusqu\'à 50 villas', 'Tout Pro +', 'iCal Airbnb / Booking', 'Multi-utilisateurs', 'API accès', 'Support prioritaire'],
  },
]

export default function SubscriptionPage() {
  const { tenant } = useAuthStore()
  const currentPlan = tenant?.plan ?? 'starter'
  const isFoundingMember = tenant?.founding_member === true

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-sm text-gray-500">Gérez votre plan et vos paiements</p>
      </div>

      {isFoundingMember && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-2xl">🌟</span>
          <div>
            <p className="font-semibold text-amber-900">Membre fondateur — Accès Pro gratuit à vie</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Vous faites partie des premiers membres de VillaHub. Votre accès Pro est offert
              définitivement, sans frais ni renouvellement.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map(plan => (
          <Card
            key={plan.key}
            className={`relative ${plan.highlight ? 'ring-2 ring-brand-800' : ''}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                LE PLUS POPULAIRE
              </div>
            )}
            <div className="text-center mb-5">
              <h2 className="font-bold text-xl text-gray-900">{plan.label}</h2>
              <div className="mt-3">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 text-sm"> TND/mois</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">~{Math.round(plan.price / 3.2)} €/mois</p>
              <p className="text-sm text-brand-700 font-medium mt-2">{plan.villas} villas max</p>
            </div>

            <ul className="space-y-2.5 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-success-600 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {isFoundingMember && plan.key === 'pro' ? (
              <div className="w-full py-2 text-center text-sm font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                🌟 Inclus — Membre fondateur
              </div>
            ) : isFoundingMember ? (
              <div className="w-full py-2 text-center text-sm text-gray-400 rounded-lg border border-gray-100 bg-gray-50">
                Non requis
              </div>
            ) : currentPlan === plan.key ? (
              <div className="w-full py-2 text-center text-sm font-medium text-success-700 bg-success-50 rounded-lg border border-success-200">
                ✓ Plan actuel
              </div>
            ) : (
              <Button
                variant={plan.highlight ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => toast.success('Redirection vers le paiement… (demo)')}
              >
                Choisir {plan.label}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Payment methods */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">Moyens de paiement acceptés</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
            <span className="font-bold text-blue-700">Konnect</span>
            <span className="text-xs text-gray-500">Tunisie</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
            <span className="font-bold text-green-700">Flouci</span>
            <span className="text-xs text-gray-500">Tunisie</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
            <span className="font-bold text-brand-700">Stripe</span>
            <span className="text-xs text-gray-500">International</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
            <span className="text-gray-700">🏦 Virement bancaire</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
