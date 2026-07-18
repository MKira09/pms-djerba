import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Home, CheckCircle, Lock, User, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

interface StripeSession { email: string; name: string; plan: string }

const PLAN_LABELS: Record<string, { label: string; price: string }> = {
  starter: { label: 'Starter', price: '29€/mois' },
  pro:     { label: 'Pro',     price: '59€/mois' },
  agence:  { label: 'Agence',  price: '99€/mois' },
}

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setProfile, setTenant } = useAuthStore()
  const sessionId = searchParams.get('session_id')

  const [stripeSession, setStripeSession] = useState<StripeSession | null>(null)
  const [verifying, setVerifying] = useState(true)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', company_name: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionId) { setVerifyError('Lien de paiement invalide.'); setVerifying(false); return }
    fetch(`/api/verify-payment?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setVerifyError(data.error); setVerifying(false); return }
        setStripeSession(data)
        setForm(f => ({ ...f, full_name: data.name || '' }))
        setVerifying(false)
      })
      .catch(err => { setVerifyError(err.message); setVerifying(false) })
  }, [sessionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeSession) return
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (form.password.length < 8) { toast.error('Mot de passe trop court (min. 8 caractères).'); return }

    setSubmitting(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: stripeSession.email,
        password: form.password,
      })
      if (authError) { toast.error('Erreur : ' + authError.message, { duration: 8000 }); return }
      if (!authData.user) { toast.error('Erreur : compte non créé.'); return }

      const { error: rpcError } = await supabase.rpc('create_tenant_and_profile', {
        p_full_name: form.full_name,
        p_company_name: form.company_name || 'Mon agence',
        p_plan: stripeSession.plan,
      })
      if (rpcError) { toast.error('Erreur profil : ' + rpcError.message, { duration: 8000 }); return }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
      if (profile) {
        setProfile(profile)
        // Attribution automatique fondateur si une place est disponible (max 3, atomique en DB)
        await supabase.rpc('apply_founding_member_if_eligible', { p_tenant_id: profile.tenant_id })
        const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
        setTenant(tenant ?? null)
      }

      toast.success('Compte créé ! Bienvenue sur VillaHub 🎉', { duration: 4000 })
      navigate('/dashboard')
    } catch (err: unknown) {
      toast.error('Erreur : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
        <p className="text-gray-500 animate-pulse">Vérification du paiement…</p>
      </div>
    )
  }

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">{verifyError}</p>
          <p className="text-gray-500 text-sm mb-4">
            Si vous venez de payer, contactez-nous à support@villahub.app
          </p>
          <Link to="/plans" className="text-brand-700 underline text-sm">Retour aux plans</Link>
        </div>
      </div>
    )
  }

  const planInfo = PLAN_LABELS[stripeSession?.plan ?? 'starter']

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-2xl mb-3 shadow-lg">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VillaHub</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Confirmation banner */}
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Paiement confirmé ✓</p>
              <p className="text-xs text-green-600 mt-0.5">
                Plan <strong>{planInfo.label}</strong> ({planInfo.price}) · {stripeSession?.email}
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-1">Finalisez votre inscription</h2>
          <p className="text-sm text-gray-400 mb-6">Choisissez un mot de passe pour accéder à votre espace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom complet"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              left={<User className="h-4 w-4" />}
              required
              placeholder="Votre nom"
            />
            <Input
              label="Nom de l'agence"
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              left={<Building className="h-4 w-4" />}
              placeholder="Votre agence"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={stripeSession?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
            <Input
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              left={<Lock className="h-4 w-4" />}
              placeholder="Min. 8 caractères"
              required
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              left={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              required
            />
            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Créer mon compte
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
