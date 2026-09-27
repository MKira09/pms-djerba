import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, User, Building, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan') ?? 'starter'
  const { setProfile, setTenant } = useAuthStore()
  const [form, setForm] = useState({ full_name: '', company_name: '', email: '', password: '', confirm: '' })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function showError(error: unknown, prefix = 'Erreur') {
    const e = error as any
    const status = e?.status ? ` [${e.status}]` : ''
    const msg = e?.message || e?.error_description || (typeof e?.toString === 'function' ? e.toString() : '') || 'inconnue'
    toast.error(prefix + status + ': ' + msg, { duration: 8000 })
    console.error(prefix, error)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (!acceptTerms) { toast.error('Merci d\'accepter les conditions générales pour créer votre compte.'); return }
    setLoading(true)
    try {
      // Étape 1 : créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      let userId: string | undefined = authData?.user?.id
      let activeSession: typeof authData.session = authData?.session ?? null
      let isResumedSignup = false

      if (authError) {
        // Cas fréquent : une inscription précédente a créé le compte auth mais s'est
        // arrêtée avant l'étape 2 (profil/agence). On tente de reprendre plutôt que
        // de bloquer définitivement cette adresse email.
        const looksAlreadyRegistered = /already registered|user already exists/i.test(authError.message || '')
        if (!looksAlreadyRegistered) { showError(authError, 'Erreur inscription'); return }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (signInError || !signInData.user) {
          toast.error(
            "Un compte existe déjà avec cet email. Si c'est le vôtre, connectez-vous depuis la page de connexion. Sinon, contactez-nous à contact.agencykira@gmail.com.",
            { duration: 9000 }
          )
          return
        }
        userId = signInData.user.id
        activeSession = signInData.session
        isResumedSignup = true
      } else if (!authData.user) {
        toast.error('Erreur : utilisateur non créé', { duration: 8000 })
        return
      } else if (!authData.session) {
        // Le compte est créé mais aucune session n'a été ouverte (confirmation par
        // email requise côté Supabase). Impossible de créer le profil dans ce cas
        // (nécessite une session active) : on informe clairement plutôt que de
        // laisser échouer l'étape suivante avec une erreur technique.
        toast.error(
          "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de continuer.",
          { duration: 9000 }
        )
        return
      }

      if (!userId) { toast.error('Erreur : utilisateur non identifié', { duration: 8000 }); return }

      // Force la prise en compte immédiate de la session par le client avant
      // d'enchaîner sur un appel authentifié : juste après signUp/signIn, le
      // client peut ne pas avoir encore propagé le jeton en interne, ce qui
      // ferait échouer auth.uid() côté base (cause du bug "id null" observé).
      if (activeSession) {
        await supabase.auth.setSession({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        })
      }

      // Étape 2 : créer le tenant + profil via la fonction SQL — seulement si ce n'est
      // pas déjà fait (reprise d'une inscription précédemment interrompue)
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()

      if (!existingProfile) {
        const { error: rpcError } = await supabase.rpc('create_tenant_and_profile', {
          p_full_name: form.full_name,
          p_company_name: form.company_name || 'Mon agence',
          p_plan: selectedPlan,
        })
        if (rpcError) { showError(rpcError, 'Erreur profil'); return }
      }

      // Notification (best-effort, ne doit jamais bloquer l'inscription)
      if (!isResumedSignup) {
        supabase.functions.invoke('notify-signup', {
          body: {
            agency_name: form.company_name || 'Mon agence',
            owner_name: form.full_name,
            owner_email: form.email,
            plan: selectedPlan,
          },
        }).catch(() => {})
      }

      // Charger le profil et le tenant dans le store
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (profile) {
        setProfile(profile)
        const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
        setTenant(tenant ?? null)
      }

      toast.success('Compte créé ! Bienvenue 🎉', { duration: 4000 })
      navigate('/onboarding')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Erreur réseau : ' + (msg || 'connexion impossible'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-2xl mb-3 shadow-lg">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VillaHub</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('auth.create_account')}</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 text-brand-700">
              3% de commission
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input label={t('auth.full_name')} value={form.full_name} onChange={e => set('full_name', e.target.value)} left={<User className="h-4 w-4" />} required placeholder="Votre nom" />
            <Input label={t('auth.company_name')} value={form.company_name} onChange={e => set('company_name', e.target.value)} left={<Building className="h-4 w-4" />} placeholder="Agence Djerba Villas" />
            <Input label={t('common.email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} left={<Mail className="h-4 w-4" />} placeholder={t('auth.email_placeholder')} required />
            <Input label={t('auth.password')} type="password" value={form.password} onChange={e => set('password', e.target.value)} left={<Lock className="h-4 w-4" />} placeholder="Min. 8 caractères" required />
            <Input label={t('auth.confirm_password')} type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} left={<Lock className="h-4 w-4" />} placeholder="••••••••" required />

            <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
                required
              />
              <span>
                J'ai lu et j'accepte les{' '}
                <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="text-brand-700 font-medium hover:underline">
                  conditions générales d'utilisation et de vente
                </Link>
              </span>
            </label>

            <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!acceptTerms}>
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.already_account')}{' '}
            <Link to="/login" className="text-brand-700 font-medium hover:underline">{t('auth.login')}</Link>
          </p>

        </div>
      </div>
    </div>
  )
}
